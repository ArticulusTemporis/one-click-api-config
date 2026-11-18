// Regenerate src/web/m3-css.js from the copied Material 3 stylesheet.
// Runs at dev time only; the app imports the generated module so the
// single-file exe has no external CSS to read.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src', 'web', 'm3.css');
const out = path.join(root, 'src', 'web', 'm3-css.js');

const css = fs.readFileSync(src, 'utf8');
const banner = '// GENERATED from src/web/m3.css by scripts/make-m3-asset.js — do not edit.\n';
fs.writeFileSync(out, banner + 'export const M3_CSS = ' + JSON.stringify(css) + ';\n', 'utf8');
console.log('wrote', out, (css.length / 1024).toFixed(1) + 'KB');
