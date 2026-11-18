// Give the built exe our own Windows resources (product name, version, icon)
// instead of node.exe's. Runs before UPX and before signing.
//
// Usage: node scripts/set-meta.js dist/aac.exe

import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('rcedit');
const rcedit = mod.rcedit || mod.default || mod;

const target = process.argv[2] || 'dist/aac.exe';
const icon = path.join(process.cwd(), 'assets', 'app.ico');

if (!fs.existsSync(target)) throw new Error('not found: ' + target);

const options = {
  'product-name': 'example公司',
  'file-description': 'example公司 · 一键配置',
  'company-name': 'Example Company',
  'legal-copyright': '© 2026 Example Company',
  'file-version': '1.0.0.0',
  'product-version': '1.0.0.0',
  'original-filename': path.basename(target),
  'internal-name': 'aac',
};
if (fs.existsSync(icon)) options.icon = icon;

await rcedit(target, options);
console.log('meta written:', Object.keys(options).join(', '));
