// Where each client can hide — built from official docs (see docs/LOCATIONS.md).
//
// Clue types, in the order they are tried:
//   config   settings file/dir (strongest: the app has been run)
//   program  install dir, either an exact path with %VARS% or a folder name
//   npm      npm/bun/pnpm global package folder
//   ext      VS Code / Cursor / Windsurf / Trae extension folder
//   appPath  HKCU/HKLM App Paths entry
//   cli      `where` / `which` (plus npm/pnpm/scoop/choco/winget bin dirs)
//   menu     Start Menu shortcut name
//
// `npm`, `program`, `config`, `ext`, `menu` accept arrays.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HOME = os.homedir();
const isWin = process.platform === 'win32';
const env = process.env;

function roots() {
  const out = [];
  const push = (p) => { if (p) out.push(p); };
  if (isWin) {
    push(env.ProgramFiles);
    push(env['ProgramFiles(x86)']);
    push(env.ProgramW6432);
    push(env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs'));
    push(env.LOCALAPPDATA);
    push(env.APPDATA);
    push(env.ProgramData);
    push(path.join(HOME, 'scoop', 'apps'));
  } else if (process.platform === 'darwin') {
    push('/Applications');
    push(path.join(HOME, 'Applications'));
    push('/opt/homebrew/bin');
    push('/usr/local/bin');
  } else {
    push('/usr/local/bin');
    push('/opt');
    push(path.join(HOME, '.local', 'bin'));
  }
  return out;
}

const ROOTS = roots();

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function expandPath(p) {
  let s = String(p);
  s = s.replace(/%([^%]+)%/g, (_, k) => env[k] ?? '');
  s = s.replace(/^~(?=$|[\\/])/, HOME);
  if (!isWin) s = s.replace(/\\/g, '/');
  return s;
}

function isExactPath(p) {
  // absolute-ish: %VAR%..., ~/..., /..., C:\...
  return /^%[^%]+%/.test(p) || /^~(?=$|[\\/])/.test(p) || /^[\\/]/.test(p) || /^[A-Za-z]:[\\/]/.test(p);
}

const BIN_DIRS = () => [
  env.APPDATA && path.join(env.APPDATA, 'npm'),
  env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'pnpm'),
  path.join(HOME, '.local', 'bin'),
  path.join(HOME, '.bun', 'bin'),
  path.join(HOME, 'scoop', 'shims'),
  env.ProgramData && path.join(env.ProgramData, 'chocolatey', 'bin'),
  env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links'),
  env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'devin', 'bin'),
  path.join(HOME, '.grok', 'bin'),
].filter(Boolean);

function where(cmd) {
  if (!cmd) return '';
  try {
    const bin = isWin ? 'where' : 'which';
    const out = execFileSync(bin, [cmd], { encoding: 'utf8', timeout: 4000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    const first = String(out).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    if (first) return first;
  } catch { /* not on PATH */ }
  const exts = isWin ? ['.cmd', '.exe', '.bat', '.ps1', ''] : [''];
  for (const dir of BIN_DIRS()) {
    for (const ext of exts) {
      const p = path.join(dir, cmd + ext);
      if (exists(p)) return p;
    }
  }
  return '';
}

function npmRoots() {
  const out = [];
  const push = (p) => { if (p) out.push(p); };
  if (isWin) {
    push(env.APPDATA && path.join(env.APPDATA, 'npm', 'node_modules'));
    push(env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'npm', 'node_modules'));
    push(env.ProgramFiles && path.join(env.ProgramFiles, 'nodejs', 'node_modules'));
  } else {
    push('/usr/local/lib/node_modules');
    push(path.join(HOME, '.npm-global', 'lib', 'node_modules'));
  }
  push(path.join(HOME, '.bun', 'install', 'global', 'node_modules'));
  return out;
}

function npmPackage(pkgs) {
  for (const pkg of pkgs || []) {
    for (const root of npmRoots()) {
      const p = path.join(root, pkg);
      if (exists(p)) return p;
    }
  }
  return '';
}

function appPath(exes) {
  if (!isWin) return '';
  for (const exe of exes || []) {
    for (const hive of ['HKCU', 'HKLM']) {
      const key = `${hive}\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${exe}`;
      try {
        const out = execFileSync('reg', ['query', key, '/ve'], {
          encoding: 'utf8', timeout: 3000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
        });
        const m = /REG_SZ\s+(.+)$/m.exec(String(out));
        if (m) return m[1].trim();
      } catch { /* absent */ }
    }
  }
  return '';
}

let dirCache = null;
function listRoots() {
  if (dirCache) return dirCache;
  const seen = [];
  for (const r of ROOTS) {
    try {
      for (const e of fs.readdirSync(r, { withFileTypes: true })) {
        if (e.isDirectory()) seen.push({ root: r, name: e.name, path: path.join(r, e.name) });
      }
    } catch { /* missing */ }
  }
  dirCache = seen;
  return seen;
}

let vscodeExts = null;
function vscodeExtensions() {
  if (vscodeExts) return vscodeExts;
  const dirs = [
    path.join(HOME, '.vscode', 'extensions'),
    path.join(HOME, '.vscode-insiders', 'extensions'),
    path.join(HOME, '.cursor', 'extensions'),
    path.join(HOME, '.windsurf', 'extensions'),
    path.join(HOME, '.trae', 'extensions'),
    path.join(HOME, '.devin', 'extensions'),
  ];
  const names = [];
  for (const d of dirs) {
    try { for (const n of fs.readdirSync(d)) names.push({ dir: d, name: n }); } catch { /* missing */ }
  }
  vscodeExts = names;
  return names;
}

function extMatch(prefixes) {
  const all = vscodeExtensions();
  for (const prefix of prefixes || []) {
    const hit = all.find((e) => e.name.toLowerCase().startsWith(String(prefix).toLowerCase()));
    if (hit) return path.join(hit.dir, hit.name);
  }
  return '';
}

/** VS Code globalStorage folder for an extension id. */
function globalStorage(ids) {
  const rootsG = [
    env.APPDATA && path.join(env.APPDATA, 'Code', 'User', 'globalStorage'),
    env.APPDATA && path.join(env.APPDATA, 'Cursor', 'User', 'globalStorage'),
    env.APPDATA && path.join(env.APPDATA, 'Windsurf', 'User', 'globalStorage'),
    env.APPDATA && path.join(env.APPDATA, 'Trae', 'User', 'globalStorage'),
  ].filter(Boolean);
  for (const id of ids || []) {
    for (const r of rootsG) {
      const p = path.join(r, id);
      if (exists(p)) return p;
    }
  }
  return '';
}

let startMenuNames = null;
function startMenu() {
  if (startMenuNames) return startMenuNames;
  const names = [];
  if (isWin) {
    const dirs = [
      env.APPDATA && path.join(env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      env.ProgramData && path.join(env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    ].filter(Boolean);
    const walk = (dir, depth) => {
      if (depth > 3) return;
      try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) walk(p, depth + 1);
          else if (/\.lnk$/i.test(e.name)) names.push({ name: e.name.replace(/\.lnk$/i, ''), path: p });
        }
      } catch { /* missing */ }
    };
    for (const d of dirs) walk(d, 0);
  }
  startMenuNames = names;
  return names;
}

let dshProfiles = null;
function dshProfileDeps() {
  if (dshProfiles) return dshProfiles;
  const out = [];
  const base = path.join(HOME, '.dsh', 'profiles');
  try {
    for (const p of fs.readdirSync(base)) {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(base, p, 'package.json'), 'utf8'));
        const deps = Object.keys(j.dependencies || {});
        const bundles = (j.dsh && j.dsh.profile && j.dsh.profile.bundles) || [];
        out.push({ profile: p, deps: deps.concat(bundles) });
      } catch { /* skip */ }
    }
  } catch { /* no dsh */ }
  dshProfiles = out;
  return out;
}

function dshPluginHit(names) {
  for (const row of dshProfileDeps()) {
    for (const n of names || []) if (row.deps.includes(n)) return row.profile + ':' + n;
  }
  return '';
}

function startMenuHit(keywords) {
  const list = startMenu();
  for (const kw of keywords || []) {
    const k = String(kw).toLowerCase();
    const hit = list.find((x) => x.name.toLowerCase().includes(k));
    if (hit) return hit.path;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Clues. `doc: true` marks paths taken from official docs (see docs/LOCATIONS.md);
// the rest are common Electron/npm conventions and are labelled as such in the UI.
// ---------------------------------------------------------------------------
export const CLUES = {
  'claude-code': {
    cli: 'claude', npm: ['@anthropic-ai/claude-code'],
    config: ['.claude/settings.json', '.claude.json', '.claude'],
    program: ['%USERPROFILE%\\.local\\bin\\claude.exe', '.local/share/claude', '.local/bin/claude'],
    appPath: ['claude.exe'], menu: ['Claude'],
  },
  codex: {
    cli: 'codex', npm: ['@openai/codex'],
    config: ['.codex/config.toml', '.codex'],
    program: ['%LOCALAPPDATA%\\Programs\\codex'],
  },
  gemini: {
    cli: 'gemini', npm: ['@google/gemini-cli'],
    config: ['.gemini/settings.json', '.gemini'],
  },
  'qwen-code': {
    cli: 'qwen', npm: ['@qwen-code/qwen-code'],
    config: ['.qwen/settings.json', '.qwen'],
  },
  'kimi-cli': {
    cli: 'kimi', npm: ['@moonshot-ai/kimi-code'],
    config: ['.kimi'],
    program: ['%LOCALAPPDATA%\\Programs\\Kimi'],
  },
  'grok-build': {
    cli: 'grok', npm: ['@xai-official/grok'],
    config: ['.grok/config.toml', '.grok'],
    program: ['%USERPROFILE%\\.grok\\bin\\grok.exe', '.grok/bin/grok'],
  },
  opencode: {
    cli: 'opencode', npm: ['opencode-ai'],
    config: ['.config/opencode/opencode.jsonc', '.config/opencode/opencode.json', '.config/opencode'],
    program: ['%ProgramData%\\opencode', '%LOCALAPPDATA%\\Programs\\opencode'],
  },
  crush: {
    cli: 'crush', npm: ['@charmland/crush'],
    config: ['%LOCALAPPDATA%\\crush\\crush.json', '.config/crush/crushrc', '.config/crush/crush.json', '.crushrc', 'crushrc'],
  },
  aider: {
    cli: 'aider',
    config: ['.aider.conf.yml', '.aider.conf.yaml', '.aider.model.settings.yml'],
    program: ['%USERPROFILE%\\.local\\bin\\aider.exe', '.local/bin/aider'],
  },
  'copilot-cli': {
    cli: 'copilot', npm: ['@github/copilot'],
    config: ['.copilot/settings.json', '.copilot/providers.json', '.copilot'],
  },
  'factory-droid': {
    cli: 'droid',
    config: ['.factory/config.json', '.factory/settings.json', '.factory'],
  },
  pi: {
    cli: 'pi', npm: ['@earendil-works/pi-coding-agent', '@mariozechner/pi-coding-agent'],
    config: ['.pi/agent/models.json', '.pi'],
  },
  iflow: {
    cli: 'iflow', npm: ['@iflow-ai/iflow-cli'],
    config: ['.iflow/settings.json', '.iflow'],
  },
  'hermes-agent': {
    cli: 'hermes', npm: [],
    config: ['.hermes/config.yaml', '.hermes/.env', '.hermes'],
    program: ['%USERPROFILE%\\.local\\bin\\hermes.exe', '.hermes/hermes-agent'],
  },
  openclaw: {
    cli: 'openclaw', npm: ['openclaw'],
    config: ['.openclaw/openclaw.json', '.openclaw'],
  },
  'minimax-code': {
    cli: 'mcode',
    config: ['.mcode', '.minimax'],
    program: ['%LOCALAPPDATA%\\Programs\\MiniMax Code'],
  },

  // ---- editors / extensions ----
  continue: {
    config: ['.continue/config.yaml', '.continue/config.json'],
    ext: ['continue.continue-'],
    globalStorage: ['continue.continue'],
  },
  kilo: {
    cli: 'kilo', npm: [],
    config: ['.config/kilo/kilo.jsonc', '.config/kilo'],
    ext: ['kilocode.kilo-code-'],
    globalStorage: ['kilocode.kilo-code'],
  },
  zed: {
    cli: 'zed',
    config: ['%APPDATA%\\Zed\\settings.json', '.config/zed/settings.json'],
    program: ['%LOCALAPPDATA%\\Programs\\Zed', 'Zed'],
  },
  'roo-code': {
    config: ['.roo'],
    ext: ['rooveterinaryinc.roo-cline-'],
    globalStorage: ['rooveterinaryinc.roo-cline'],
    deprecated: '2026-05-15 官方停服并归档',
  },
  'cline-vscode': {
    config: ['.cline/data'],
    ext: ['saoudrizwan.claude-dev-'],
    globalStorage: ['saoudrizwan.claude-dev'],
  },
  cursor: {
    cli: 'cursor', config: ['%APPDATA%\\Cursor'],
    program: ['%LOCALAPPDATA%\\Programs\\cursor\\Cursor.exe', '%LOCALAPPDATA%\\Programs\\cursor'],
    appPath: ['Cursor.exe'], menu: ['Cursor'],
  },
  trae: {
    config: ['%USERPROFILE%\\.trae', '%APPDATA%\\Trae'],
    program: ['%LOCALAPPDATA%\\Programs\\Trae'],
    appPath: ['Trae.exe'], menu: ['Trae'],
  },
  windsurf: {
    // renamed to Devin Desktop in 2026-06; check both
    cli: 'devin-desktop',
    config: ['%APPDATA%\\Devin', '%APPDATA%\\Windsurf', '%USERPROFILE%\\.codeium\\windsurf'],
    program: ['%LOCALAPPDATA%\\devin\\bin\\devin.exe', '%LOCALAPPDATA%\\Programs\\Windsurf'],
    appPath: ['Devin.exe', 'Windsurf.exe'], menu: ['Devin', 'Windsurf'],
  },

  // ---- desktop apps ----
  'cherry-studio': {
    config: ['%APPDATA%\\CherryStudio', '%USERPROFILE%\\.cherrystudio'],
    program: ['%LOCALAPPDATA%\\Programs\\Cherry Studio', '%LOCALAPPDATA%\\Programs\\CherryStudio'],
    appPath: ['Cherry Studio.exe'], menu: ['Cherry Studio'],
  },
  chatbox: {
    config: ['%APPDATA%\\xyz.chatboxapp.app', '%APPDATA%\\Chatbox', '%APPDATA%\\chatbox'],
    program: ['%LOCALAPPDATA%\\Programs\\Chatbox'],
    appPath: ['Chatbox.exe'], menu: ['Chatbox'],
  },
  workbuddy: {
    config: ['%USERPROFILE%\\.workbuddy', '%USERPROFILE%\\WorkBuddy', '%APPDATA%\\WorkBuddy'],
    program: ['%LOCALAPPDATA%\\Programs\\WorkBuddy'],
    appPath: ['WorkBuddy.exe'], menu: ['WorkBuddy'],
  },
  jan: {
    cli: 'jan',
    config: ['%APPDATA%\\Jan', '%APPDATA%\\Jan\\data'],
    program: ['%LOCALAPPDATA%\\Programs\\jan', '%LOCALAPPDATA%\\Programs\\Jan'],
    appPath: ['Jan.exe'], menu: ['Jan'],
  },

  // ---- web / self hosted ----
  'open-webui': {
    cli: 'open-webui',
    config: ['.open-webui'],
    program: ['%LOCALAPPDATA%\\Programs\\Open WebUI'],
    docker: true, menu: ['Open WebUI'],
  },
  'lobe-chat': {
    config: ['%APPDATA%\\lobehub-storage', '%APPDATA%\\LobeHub'],
    docker: true, menu: ['LobeHub', 'LobeChat'],
  },
  anythingllm: {
    config: ['%APPDATA%\\anythingllm-desktop'],
    program: ['%LOCALAPPDATA%\\Programs\\AnythingLLM', '%LOCALAPPDATA%\\Programs\\anythingllm-desktop'],
    appPath: ['AnythingLLM.exe'], menu: ['AnythingLLM'],
  },
  nextchat: {
    config: ['%APPDATA%\\NextChat'],
    program: ['%LOCALAPPDATA%\\Programs\\NextChat'],
    docker: true, menu: ['NextChat'],
  },

  // ---- DSH family ----
  'deepseek-harness': {
    cli: 'dsh',
    config: ['.dsh', '%LOCALAPPDATA%\\Programs\\DeepSeek Harness', '%APPDATA%\\@deepseek-ai\\dsh-desktop'],
    program: ['%LOCALAPPDATA%\\Programs\\DeepSeek Harness'],
    appPath: ['DeepSeek Harness.exe'], menu: ['DeepSeek Harness'],
  },
  'dsh-go': { remote: true },
  'ds-bot': { config: ['.dsh/bot/state.json'], dshPlugin: ['ds-bot', '@lininn/ds-bot'], menu: [] },
  deepseekbot: { config: [], dshPlugin: ['deepseekbot'], menu: [] },
  'dsh-channels': { config: [], dshPlugin: ['@codepunk-gm/dsh-channels', '@wsz987/dsh-channels', 'dsh-channels'], menu: [] },
};

const CACHE = new Map();
const TTL = 60_000;

export function locate(id, opts = {}) {
  const key = id + (opts.fast ? ':fast' : '');
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const v = locateUncached(id, opts);
  CACHE.set(key, { t: Date.now(), v });
  return v;
}

export function clearLocateCache() {
  CACHE.clear();
}

const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function locateUncached(id, opts = {}) {
  const c = CLUES[id] || {};

  // config files / dirs
  const configHits = [];
  for (const raw of asList(c.config)) {
    const full = isExactPath(raw) ? expandPath(raw) : path.join(HOME, raw);
    if (exists(full)) configHits.push(full);
  }

  // install dirs: exact paths first, then top-level folder names
  let programHit = '';
  for (const raw of asList(c.program)) {
    if (!isExactPath(raw)) continue;
    const full = expandPath(raw);
    if (exists(full)) { programHit = full; break; }
  }
  if (!programHit) {
    const names = asList(c.program).filter((p) => !isExactPath(p));
    for (const name of names) {
      for (const r of ROOTS) {
        const p = path.join(r, name);
        if (exists(p)) { programHit = p; break; }
      }
      if (programHit) break;
    }
  }
  if (!programHit) {
    const names = asList(c.program).filter((p) => !isExactPath(p)).map((s) => s.toLowerCase());
    const hit = listRoots().find((d) => names.some((n) => d.name.toLowerCase().includes(n)));
    if (hit) programHit = hit.path;
  }

  const pluginHit = dshPluginHit(asList(c.dshPlugin));
  const npmHit = programHit ? '' : npmPackage(asList(c.npm));
  const extHit = extMatch(asList(c.ext));
  const gsHit = globalStorage(asList(c.globalStorage));
  const regHit = (!programHit && !npmHit) ? appPath(asList(c.appPath)) : '';
  const cliHit = (!opts.fast && !configHits.length && !programHit && !npmHit && !regHit && !extHit) ? where(c.cli) : '';
  const menuHit = (!opts.fast && !configHits.length && !programHit && !npmHit && !regHit && !extHit && !cliHit)
    ? startMenuHit(asList(c.menu)) : '';

  let via = '';
  if (configHits.length) via = 'config';
  else if (programHit) via = 'program';
  else if (extHit) via = 'vscode-extension';
  else if (gsHit) via = 'vscode-globalStorage';
  else if (pluginHit) via = 'dsh-plugin';
  else if (npmHit) via = 'npm-package';
  else if (regHit) via = 'registry';
  else if (cliHit) via = 'command';
  else if (menuHit) via = 'start-menu';

  const firstRaw = asList(c.program)[0] || asList(c.config)[0] || (c.cli ? 'where ' + c.cli : '');
  const hint = firstRaw ? (isExactPath(firstRaw) ? expandPath(firstRaw) : path.join(HOME, firstRaw)) : '';

  return {
    installed: !!via,
    hint,
    via,
    configPath: configHits[0] || '',
    configHits,
    programPath: programHit || npmHit || regHit || menuHit || '',
    pluginPath: pluginHit,
    cliPath: cliHit,
    extPath: extHit || gsHit,
    evidence: [programHit, pluginHit, npmHit, extHit, gsHit, regHit, cliHit, menuHit].filter(Boolean)[0] || '',
    dockerOnly: !!c.docker,
    remoteOnly: !!c.remote,
    deprecated: c.deprecated || '',
  };
}

export function locateAll(ids) {
  const out = {};
  for (const id of ids) out[id] = locate(id);
  return out;
}

export function searchRoots() {
  return ROOTS;
}
