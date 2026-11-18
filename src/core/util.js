// Small, dependency-free helpers shared by every adapter.

export const PROTOCOLS = ['openai-chat', 'openai-responses', 'anthropic', 'gemini'];

export const PROTOCOL_LABEL = {
  'openai-chat': 'OpenAI Chat Completions',
  'openai-responses': 'OpenAI Responses',
  anthropic: 'Anthropic Messages',
  gemini: 'Gemini native',
};

/** Base URL normalisation. `style` is what the client expects to append to. */
export function urlBase(base, style) {
  let b = String(base || '').trim().replace(/\/+$/, '');
  const hasV1 = /\/v1$/i.test(b);
  if (style === 'v1') return hasV1 ? b : b + '/v1';
  if (style === 'root') return hasV1 ? b.replace(/\/v1$/i, '') : b;
  return b;
}

export function sameBase(a, b) {
  return String(a || '').trim().replace(/\/+$/, '').toLowerCase() ===
    String(b || '').trim().replace(/\/+$/, '').toLowerCase();
}

/** Protocol a client can consume directly for a given provider protocol. */
export function needsGateway(clientProtocols, providerProtocol) {
  return !clientProtocols.includes(providerProtocol);
}

export function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'provider';
}

export function envName(provider) {
  if (provider.apiKeyEnv) return provider.apiKeyEnv;
  return slug(provider.id).replace(/-/g, '_').toUpperCase() + '_API_KEY';
}

export function mask(key) {
  const k = String(key || '');
  if (k.length <= 8) return k ? '****' : '';
  return k.slice(0, 4) + '…' + k.slice(-4);
}

export function deepGet(obj, pathArr) {
  let cur = obj;
  for (const k of pathArr) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

export function deepSet(obj, pathArr, value) {
  let cur = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const k = pathArr[i];
    if (cur[k] == null || typeof cur[k] !== 'object' || Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[pathArr[pathArr.length - 1]] = value;
  return obj;
}

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a !== 'object') return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

/** Line diff (LCS). Returns [{t:' '|'-'|'+', s}] and a compact unified text. */
export function diffLines(before, after) {
  const A = String(before ?? '').split('\n');
  const B = String(after ?? '').split('\n');
  const n = A.length, m = B.length;
  if (n * m > 4_000_000) {
    return [{ t: '-', s: '(diff too large)' }];
  }
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ t: ' ', s: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', s: A[i] }); i++; }
    else { out.push({ t: '+', s: B[j] }); j++; }
  }
  while (i < n) out.push({ t: '-', s: A[i++] });
  while (j < m) out.push({ t: '+', s: B[j++] });
  return out;
}

export function unified(before, after, path = '') {
  const d = diffLines(before, after);
  const changed = d.some((x) => x.t !== ' ');
  if (!changed) return '';
  const head = `--- ${path || 'file'}\n+++ ${path || 'file'} (new)\n`;
  return head + d.map((x) => x.t + x.s).join('\n');
}
