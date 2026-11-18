// Fetch UPX (once) into .tools/, so the light build has a compressor.
// Usage: node scripts/get-upx.js
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, '.tools');
const exe = path.join(dir, 'upx', 'upx-5.3.0-win64', 'upx.exe');

if (fs.existsSync(exe)) {
  console.log('upx already present:', exe);
  process.exit(0);
}

const url = 'https://github.com/upx/upx/releases/download/v5.3.0/upx-5.3.0-win64.zip';
const zip = path.join(dir, 'upx.zip');
fs.mkdirSync(dir, { recursive: true });

console.log('downloading', url);
const res = await fetch(url, { redirect: 'follow' });
if (!res.ok) throw new Error('download failed: HTTP ' + res.status);
fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));

console.log('extracting...');
execFileSync('powershell', ['-NoProfile', '-Command',
  `Expand-Archive -Path '${zip}' -DestinationPath '${path.join(dir, 'upx')}' -Force`], { stdio: 'inherit' });

if (!fs.existsSync(exe)) throw new Error('upx.exe not found after extraction');
fs.rmSync(zip, { force: true });
console.log('ready:', exe);
