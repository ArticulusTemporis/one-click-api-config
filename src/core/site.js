// Panel-side API. Everything here talks to the relay's own endpoints:
//   POST /api/v1/auth/login   {email, password} -> {access_token, user}
//   GET  /api/v1/keys         Bearer token       -> key list
//   GET  /api/v1/auth/me      Bearer token       -> account
//   GET  /v1/models           Bearer sk-...      -> models of that key
// Tokens never leave this machine.

import { urlBase } from './util.js';

const T = 15000;

function authHeaders(token) {
  return token ? { authorization: 'Bearer ' + token } : {};
}

async function jfetch(url, opts = {}) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(opts.timeout || T) });
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = null; }
  return { ok: r.ok, status: r.status, body, text };
}

export function siteBase(site) {
  return String(site || '').replace(/\/+$/, '');
}

export async function login({ site, email, password }) {
  if (!email || !password) throw new Error('需要邮箱和密码');
  const r = await jfetch(siteBase(site) + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: String(email).trim(), password: String(password) }),
  });
  if (!r.ok) {
    const msg = r.body?.message || r.body?.reason || ('HTTP ' + r.status);
    throw new Error(msg);
  }
  const d = r.body?.data || r.body || {};
  return {
    token: d.access_token || d.token,
    refresh: d.refresh_token || '',
    expiresIn: d.expires_in || 0,
    user: d.user || null,
  };
}

export async function fetchMe(site, token) {
  const r = await jfetch(siteBase(site) + '/api/v1/auth/me', { headers: authHeaders(token) });
  if (!r.ok) return null;
  return r.body?.data || r.body || null;
}

export async function fetchKeys(site, token) {
  const r = await jfetch(siteBase(site) + '/api/v1/keys', { headers: authHeaders(token) });
  if (!r.ok) throw new Error(r.body?.message || ('keys HTTP ' + r.status));
  const d = r.body?.data;
  const list = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(r.body?.items) ? r.body.items : [];
  return list.map((k, i) => {
    const g = k.group && typeof k.group === 'object' ? k.group : null;
    return {
      id: String(k.id ?? k.key_id ?? i),
      name: k.name || k.remark || ('key-' + (i + 1)),
      key: k.key || k.api_key || k.token || '',
      group: (g && g.name) || k.group_name || (typeof k.group === 'string' ? k.group : ''),
      rate: g ? g.rate_multiplier : undefined,
      platform: g ? g.platform : undefined,
      image: g ? !!g.allow_image_generation : undefined,
      status: k.status ?? 1,
      used: k.used_quota ?? k.quota_used ?? null,
      quota: k.quota ?? k.quota_limit ?? null,
    };
  });
}

export async function fetchGroups(site, token) {
  const r = await jfetch(siteBase(site) + '/api/v1/groups/available', { headers: authHeaders(token) });
  if (!r.ok) return [];
  const d = r.body?.data;
  return Array.isArray(d) ? d : [];
}

export async function fetchModelsForKey(base, key) {
  const root = urlBase(base, 'v1');
  const r = await jfetch(root + '/models', { headers: authHeaders(key) });
  if (!r.ok) throw new Error(r.body?.message || ('models HTTP ' + r.status));
  const d = r.body?.data || r.body?.models || [];
  return (Array.isArray(d) ? d : [])
    .map((m) => (typeof m === 'string' ? { id: m } : { id: m.id, owned: m.owned_by || m.owned }))
    .filter((m) => m.id);
}

export function maskKey(k) {
  const s = String(k || '');
  if (s.length <= 12) return s ? s.slice(0, 3) + '••••' : '';
  return s.slice(0, 6) + '••••' + s.slice(-4);
}
