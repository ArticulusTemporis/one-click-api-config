// CI build for the public repository: bundle -> SEA -> exe, no UPX, no signing.
// SignPath (or any external signer) signs the produced aac.exe afterwards.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = process.cwd();
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

const run = (cmd, args) => {
  process.stdout.write(`$ ${cmd} ${args.join(' ')}\n`);
  execFileSync(cmd, args, { stdio: 'inherit', cwd: root });
};

// 1. bundle to CJS
run('npx', ['--yes', 'esbuild@0.23.1', 'bin/aac.js', '--bundle', '--platform=node', '--format=cjs',
  '--outfile=dist/bundle.cjs', '--log-level=warning']);

// 2. SEA blob
const seaConfig = {
  main: 'dist/bundle.cjs',
  output: 'dist/sea-prep.blob',
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
};
fs.writeFileSync(path.join(dist, 'sea-config.json'), JSON.stringify(seaConfig, null, 2));
run(process.execPath, ['--experimental-sea-config', path.join('dist', 'sea-config.json')]);

// 3. base node binary -> exe, inject blob
const nodeExe = process.execPath;
fs.copyFileSync(nodeExe, path.join(dist, 'aac.exe'));
run('npx', ['--yes', 'postject@1.0.0-alpha.6', path.join('dist', 'aac.exe'), 'NODE_SEA_BLOB',
  path.join('dist', 'sea-prep.blob'), '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2']);

// 4. drop node.exe's now-invalid signature, switch to GUI subsystem, write resources
run(process.execPath, [path.join('scripts', 'strip-signature.js'), path.join('dist', 'aac.exe')]);
run(process.execPath, [path.join('scripts', 'patch-pe.js'), path.join('dist', 'aac.exe'), 'gui']);
if (process.platform === 'win32') {
  try {
    run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
      path.join('scripts', 'set-exe-resources.ps1'), '-Exe', path.join('dist', 'aac.exe'),
      '-Icon', path.join('assets', 'app.ico')]);
  } catch {
    console.log('resource step skipped');
  }
}

const size = (fs.statSync(path.join(dist, 'aac.exe')).size / 1048576).toFixed(1);
console.log(`\nbuilt dist/aac.exe (${size} MB) on ${os.platform()}`);
