// First-run trust: put our publisher certificate into the current user's Root
// store so Windows shows a verified publisher instead of an unknown one.
//
// Best effort and silent: when it cannot run (not admin, no powershell, not
// Windows) nothing breaks - the app just stays "unverified publisher".

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { CERT_BASE64, CERT_NAME } from './cert.js';

const isWin = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, { windowsHide: true, ...opts });
      let out = '';
      child.stdout?.on('data', (d) => { out += d; });
      child.stderr?.on('data', (d) => { out += d; });
      child.on('error', () => resolve({ ok: false, out: '' }));
      child.on('close', (code) => resolve({ ok: code === 0, out }));
    } catch {
      resolve({ ok: false, out: '' });
    }
  });
}

async function isTrusted() {
  const ps = `$c = Get-ChildItem Cert:\\CurrentUser\\Root | Where-Object { $_.Subject -like '*${CERT_NAME}*' }; if ($c) { 'yes' } else { 'no' }`;
  const r = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps]);
  return r.out.includes('yes');
}

/**
 * @returns {Promise<'trusted'|'installed'|'skipped'>}
 */
export async function ensurePublisherTrust() {
  if (!isWin || !CERT_BASE64) return 'skipped';
  try {
    if (await isTrusted()) return 'trusted';

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aac-cert-'));
    const cer = path.join(dir, 'publisher.cer');
    fs.writeFileSync(cer, Buffer.from(CERT_BASE64, 'base64'));

    // elevated certutil: the user sees one UAC prompt, then it is permanent
    const ps = `Start-Process -FilePath certutil.exe -ArgumentList '-addstore','-f','Root','"${cer}"' -Verb RunAs -WindowStyle Hidden -Wait`;
    const r = await run('powershell', ['-NoProfile', '-Command', ps]);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    return r.ok ? 'installed' : 'skipped';
  } catch {
    return 'skipped';
  }
}
