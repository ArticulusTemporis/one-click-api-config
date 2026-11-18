import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const isWin = process.platform === 'win32';
export const HOME = os.homedir();

export function aacHome() {
  return process.env.AAC_HOME || path.join(HOME, '.agent-api-config');
}

export function profileName() {
  if (process.env.AAC_PROFILE) return String(process.env.AAC_PROFILE).replace(/[^a-z0-9_-]/gi, '');
  try {
    const p = path.join(aacHome(), 'active-profile.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const n = String(j.profile || 'default').replace(/[^a-z0-9_-]/gi, '');
    return n || 'default';
  } catch {
    return 'default';
  }
}

export function setProfile(name) {
  const n = String(name || 'default').replace(/[^a-z0-9_-]/gi, '') || 'default';
  ensureDir(aacHome());
  fs.writeFileSync(path.join(aacHome(), 'active-profile.json'), JSON.stringify({ profile: n }, null, 2) + '\n', 'utf8');
  return n;
}

export function statePath() {
  const p = profileName();
  const base = p && p !== 'default' ? `state.${p}.json` : 'state.json';
  return path.join(aacHome(), base);
}

export function backupRoot() {
  return path.join(aacHome(), 'backups');
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

export function expand(p) {
  if (!p) return p;
  return p
    .replace(/^~(?=$|[\\/])/, HOME)
    .replace(/%([^%]+)%/g, (_, k) => process.env[k] ?? '')
    .replace(/\$\{([^}]+)\}/g, (_, k) => process.env[k] ?? '');
}

export function exists(p) {
  try { return fs.existsSync(expand(p)); } catch { return false; }
}

export function isDir(p) {
  try { return fs.statSync(expand(p)).isDirectory(); } catch { return false; }
}

export function readSafe(p) {
  const full = expand(p);
  try {
    return { exists: true, text: fs.readFileSync(full, 'utf8') };
  } catch (e) {
    if (e.code === 'ENOENT') return { exists: false, text: '' };
    throw e;
  }
}

let stamp = null;
export function sessionStamp(now = new Date()) {
  if (!stamp) {
    const p = (n) => String(n).padStart(2, '0');
    stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  }
  return stamp;
}

function backupDir() {
  const dir = path.join(backupRoot(), sessionStamp());
  ensureDir(dir);
  return dir;
}

/** Copy the current file into the backup tree and record it in manifest.json. */
export function backupFile(p, text) {
  const full = expand(p);
  const dir = backupDir();
  const name = full.replace(/^[A-Za-z]:/, '').replace(/^[\\/]+/, '').replace(/[:\\/]+/g, '__');
  const dest = path.join(dir, name);
  fs.writeFileSync(dest, text ?? '', 'utf8');
  const manifestPath = path.join(dir, 'manifest.json');
  let manifest = [];
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { manifest = []; }
  manifest.push({ original: full, saved: name, at: new Date().toISOString() });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return dest;
}

export function atomicWrite(p, text) {
  const full = expand(p);
  ensureDir(path.dirname(full));
  const tmp = full + '.aac-tmp-' + process.pid;
  fs.writeFileSync(tmp, text, 'utf8');
  try {
    fs.renameSync(tmp, full);
  } catch {
    fs.copyFileSync(tmp, full);
    fs.rmSync(tmp, { force: true });
  }
  return full;
}

export function listBackups(limit = 50) {
  const root = backupRoot();
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const dir of fs.readdirSync(root)) {
    const d = path.join(root, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    let manifest = [];
    try { manifest = JSON.parse(fs.readFileSync(path.join(d, 'manifest.json'), 'utf8')); } catch { manifest = []; }
    const byName = new Map(manifest.map((m) => [m.saved, m]));
    for (const f of fs.readdirSync(d)) {
      if (f === 'manifest.json') continue;
      const fp = path.join(d, f);
      const st = fs.statSync(fp);
      out.push({
        stamp: dir,
        file: f,
        path: fp,
        original: byName.get(f)?.original || '',
        size: st.size,
        mtime: st.mtime.toISOString(),
      });
    }
  }
  return out.sort((a, b) => (a.mtime < b.mtime ? 1 : -1)).slice(0, limit);
}

/** Restore every file recorded in one backup folder. */
export function rollbackStamp(stampId) {
  const dir = path.join(backupRoot(), stampId);
  if (!fs.existsSync(dir)) throw new Error('backup not found: ' + stampId);
  let manifest = [];
  try { manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); } catch { manifest = []; }
  const restored = [];
  for (const m of manifest) {
    const savedPath = path.join(dir, m.saved);
    if (!fs.existsSync(savedPath)) continue;
    const text = fs.readFileSync(savedPath, 'utf8');
    atomicWrite(m.original, text);
    restored.push(m.original);
  }
  return restored;
}
