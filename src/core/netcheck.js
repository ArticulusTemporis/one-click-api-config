// Network checks for the "both endpoints unreachable" case.
//
// Sources for the advice: the support guide in
// ~/.dsh/worlds/default/room/工作/客服处理指南.md
//   - four usable addresses, example4.com is the fallback when others fail
//   - ENOTFOUND => local DNS / VPN / Clash / Tailscale took over DNS
//   - check proxy, try 223.5.5.5, try phone hotspot

import fs from 'node:fs';
import dns from 'node:dns';
import { execFile, execFileSync } from 'node:child_process';

export const ENDPOINTS = [
  { id: 'example2', label: 'example2.com', url: 'https://example2.com', note: '客服实测最快 0.2s' },
  { id: 'example1', label: 'example1.com', url: 'https://example1.com', note: '主站 0.8s' },
  { id: 'sub-cn', label: 'example3.com', url: 'https://example3.com', note: '面板默认 1.8s' },
  { id: 'sub-example4', label: 'example4.com', url: 'https://example4.com', note: '备用：别的都连不上时用它 0.29s' },
];

function withV1(url) {
  return String(url).replace(/\/+$/, '').replace(/\/v1$/i, '') + '/v1';
}

async function probeOnce(url, timeout = 6000) {
  const t0 = Date.now();
  try {
    const r = await fetch(url + '/', {
      method: 'GET',
      redirect: 'follow',
      headers: { accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(timeout),
    });
    return { ok: r.status < 500, ms: Date.now() - t0, status: r.status };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: String(e.message || e) };
  }
}

/** Probe every endpoint twice; "stable" means it answered twice. */
export async function probeEndpoints(list = ENDPOINTS) {
  const out = [];
  for (const ep of list) {
    const a = await probeOnce(ep.url);
    const b = a.ok ? await probeOnce(ep.url) : { ok: false, ms: 0, error: a.error };
    out.push({
      ...ep,
      baseUrl: withV1(ep.url),
      ok: a.ok && b.ok,
      stable: a.ok && b.ok,
      ms: a.ok ? Math.round((a.ms + b.ms) / 2) : a.ms,
      status: a.status,
      error: a.error || b.error || '',
    });
  }
  out.sort((x, y) => (x.ok === y.ok ? x.ms - y.ms : x.ok ? -1 : 1));
  return out;
}

/** Three-line health strip for the manual first screen. */
export async function quickNet() {
  const rows = [
    { id: 'aliyun', label: '网络延迟', url: 'https://www.example.com', note: '' },
    { id: 'example1', label: '中转站 1 · example1.com', url: 'https://example1.com', note: '主站' },
    { id: 'example2', label: '中转站 2 · example2.com', url: 'https://example2.com', note: '备用入口' },
  ];
  const out = [];
  for (const r of rows) {
    const a = await probeOnce(r.url, 5000);
    out.push({ ...r, ok: a.ok, ms: a.ms, status: a.status, error: a.error || '' });
  }
  return { at: new Date().toISOString(), rows: out };
}

export async function pickEndpoint() {
  const list = await probeEndpoints();
  const good = list.filter((e) => e.ok && e.stable);
  return { best: good[0] || list.find((e) => e.ok) || null, list };
}

function exec(cmd, args, timeout = 5000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: String(stdout || ''), err: String(stderr || '') });
    });
  });
}

export async function dnsCheck(host) {
  const out = { host, system: null, public8: null, public114: null };
  try {
    const r = await Promise.race([
      dns.promises.resolve4(host),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
    out.system = r;
  } catch (e) {
    out.systemError = String(e.message || e);
  }
  if (process.platform === 'win32') {
    const a = await exec('nslookup', [host, '8.8.8.8'], 6000);
    out.public8 = /Address(es)?:\s*([0-9.]+)/i.test(a.out) && !/can't find|找不到|timed? ?out/i.test(a.out);
    const b = await exec('nslookup', [host, '223.5.5.5'], 6000);
    out.public114 = /Address(es)?:\s*([0-9.]+)/i.test(b.out) && !/can't find|找不到|timed? ?out/i.test(b.out);
  }
  return out;
}

export function proxyState() {
  const envKeys = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'];
  const envHits = envKeys.filter((k) => process.env[k]).map((k) => `${k}=${process.env[k]}`);
  const state = { env: envHits, system: null, note: '' };
  if (process.platform === 'win32') {
    try {
      const out = execFileSync('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', 'ProxyEnable'], {
        encoding: 'utf8', timeout: 4000, windowsHide: true,
      });
      state.system = /ProxyEnable\s+REG_DWORD\s+0x1/i.test(out);
    } catch { state.system = null; }
  }
  if (state.system === true || envHits.length) state.note = '本机开着代理，先关掉再试';
  return state;
}

/**
 * Full diagnosis. `ok:false` means nothing answered, and `advice` is ordered
 * from "most likely on this machine" to " escalate to the site".
 */
export async function diagnoseNetwork() {
  const endpoints = await probeEndpoints();
  const anyOk = endpoints.some((e) => e.ok);
  const host = 'example1.com';
  const dnsResult = anyOk ? null : await dnsCheck(host);
  const proxy = proxyState();
  const advice = [];

  if (anyOk) {
    return { ok: true, endpoints, best: endpoints.find((e) => e.ok), dns: null, proxy, advice: [] };
  }

  if (dnsResult && dnsResult.system === null) {
    advice.push('四个地址都解析不出 IP：本机 DNS 被接管了（VPN / Tailscale / Clash 的 MagicDNS 最常见）。先关掉这些再试。');
    if (dnsResult.public8 || dnsResult.public114) {
      advice.push('换成公共 DNS 能解析：把网卡 DNS 改成 223.5.5.5 或 8.8.8.8。');
    }
  } else {
    advice.push('域名能解析但连不上：可能是线路或本机防火墙拦了。');
  }
  if (proxy.note) advice.push(proxy.note + '（Windows 设置 → 网络和 Internet → 代理 → 关闭「使用代理服务器」）。');
  advice.push('用 https://example4.com/v1 再试一次：同一个 key 能用，这是别的都连不上时的备用地址。');
  advice.push('电脑连手机热点再试：能通就是本机网络，还是不通就是站点那头，把截图发给客服。');
  advice.push('排查命令：Win+R → cmd → nslookup example1.com 8.8.8.8');

  return { ok: false, endpoints, best: null, dns: dnsResult, proxy, advice };
}
