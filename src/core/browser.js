// Read the panel's session out of a local browser profile.
//
// The panel keeps its session in localStorage: `auth_token` holds a JWT.
// Chromium stores localStorage as LevelDB files under
//   <profile>/Local Storage/leveldb/*.ldb|*.log
// so we scan those files for JWT-shaped strings and validate each one against
// the site's own API. Only a token that actually returns 200 is used.
//
// Nothing is uploaded: this runs locally, only when the user clicks the button,
// and the token never leaves the machine except as a request to the same site.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function candidateRoots() {
  const home = os.homedir();
  const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const roam = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  const mac = path.join(home, 'Library', 'Application Support');
  return [
    { browser: 'Edge', dir: path.join(local, 'Microsoft', 'Edge', 'User Data') },
    { browser: 'Edge Beta', dir: path.join(local, 'Microsoft', 'Edge Beta', 'User Data') },
    { browser: 'Chrome', dir: path.join(local, 'Google', 'Chrome', 'User Data') },
    { browser: 'Chromium', dir: path.join(local, 'Chromium', 'User Data') },
    { browser: 'Brave', dir: path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data') },
    { browser: 'Edge', dir: path.join(roam, 'Microsoft', 'Edge', 'User Data') },
    { browser: 'Chrome', dir: path.join(mac, 'Google', 'Chrome') },
  ];
}

export function profileDirs() {
  const out = [];
  for (const c of candidateRoots()) {
    if (!fs.existsSync(c.dir)) continue;
    let entries = [];
    try { entries = fs.readdirSync(c.dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name !== 'Default' && !/^Profile \d+$/.test(e.name)) continue;
      const ls = path.join(c.dir, e.name, 'Local Storage', 'leveldb');
      if (fs.existsSync(ls)) out.push({ browser: c.browser, profile: e.name, dir: ls });
    }
  }
  return out;
}

function readTokensFrom(dir) {
  let files = [];
  try { files = fs.readdirSync(dir); } catch { return []; }
  const tokens = new Set();
  for (const f of files) {
    if (!/\.(ldb|log)$/i.test(f)) continue;
    const p = path.join(dir, f);
    let buf;
    try {
      const st = fs.statSync(p);
      if (st.size > 200 * 1024 * 1024) continue;
      buf = fs.readFileSync(p);
    } catch {
      // locked file: copy to temp and read the copy
      try {
        const tmp = path.join(os.tmpdir(), 'aac-ls-' + process.pid + '-' + f);
        fs.copyFileSync(p, tmp);
        buf = fs.readFileSync(tmp);
        fs.rmSync(tmp, { force: true });
      } catch { continue; }
    }
    const text = buf.toString('latin1');
    const m = text.match(JWT);
    if (m) for (const t of m) tokens.add(t);
  }
  return [...tokens];
}

async function tryToken(site, token) {
  const r = await fetch(String(site).replace(/\/+$/, '') + '/api/v1/keys', {
    headers: { authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) return null;
  const body = await r.json().catch(() => null);
  if (!body || body.code !== 0) return null;
  const items = body.data?.items || body.data || [];
  const keys = (Array.isArray(items) ? items : []).map((k) => {
    const g = k.group && typeof k.group === 'object' ? k.group : null;
    return {
      id: String(k.id),
      name: k.name || ('key-' + k.id),
      group: (g && g.name) || k.group_name || '',
      rate: g ? g.rate_multiplier : undefined,
      platform: g ? g.platform : undefined,
      image: g ? !!g.allow_image_generation : undefined,
      key: k.key || '',
      status: k.status,
      used: k.quota_used ?? null,
    };
  });
  return keys;
}

async function fetchMe(site, token) {
  try {
    const r = await fetch(String(site).replace(/\/+$/, '') + '/api/v1/auth/me', {
      headers: { authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) return null;
    const b = await r.json();
    return b.data || b;
  } catch { return null; }
}

/**
 * Scan every local Chromium profile for a session that works on `site`.
 * Returns { ok, token, keys, user, browser, profile } or { ok:false, reason, scanned }.
 */
export async function readSessionFromBrowser(site) {
  const profiles = profileDirs();
  if (!profiles.length) return { ok: false, reason: '本机没找到 Chromium 系浏览器的配置目录', scanned: 0 };
  let scanned = 0;
  for (const p of profiles) {
    for (const token of readTokensFrom(p.dir)) {
      scanned++;
      const keys = await tryToken(site, token);
      if (!keys) continue;
      const user = await fetchMe(site, token);
      return { ok: true, token, keys, user, browser: p.browser, profile: p.profile, scanned };
    }
  }
  return {
    ok: false,
    reason: scanned
      ? `扫到 ${scanned} 个候选令牌，但都对不上这个站点（可能登录在别的浏览器/配置里）`
      : '浏览器里没有找到可用的登录令牌，先在浏览器登录一次面板',
    scanned,
  };
}
