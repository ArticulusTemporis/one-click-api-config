// Render the UI with a stub DOM to catch runtime errors without a browser.
import fs from 'node:fs';
import { APP_JS } from '../src/web/assets.js';

const bootJson = JSON.parse(fs.readFileSync(process.argv[2] || 'boot.json', 'utf8'));

function el(id) {
  const e = {
    id, className: '', innerHTML: '', textContent: '', value: '', style: {}, dataset: {},
    children: [],
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else { on ? this._s.add(c) : this._s.delete(c); } },
      contains(c) { return this._s.has(c); },
    },
    querySelector() { return el('q'); }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {}, appendChild(c) { this.children.push(c); return c; },
    remove() {}, focus() {}, setSelectionRange() {}, getAttribute() { return ''; },
    setAttribute() {}, click() {}, scrollIntoView() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 12, height: 12 }; },
  };
  return e;
}
const cache = new Map();
globalThis.document = {
  title: '', documentElement: el('html'), body: el('body'),
  getElementById(id) { if (!cache.has(id)) cache.set(id, el(id)); return cache.get(id); },
  querySelector() { return el('q'); }, querySelectorAll() { return []; },
  createElement() { return el('new'); }, addEventListener() {}, execCommand() { return true; },
};
globalThis.window = { addEventListener() {}, scrollTo() {}, scrollY: 0, innerWidth: 1200, matchMedia() { return { matches: false, addEventListener() {} }; } };
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText() { return Promise.resolve(); } } },
  configurable: true,
});
globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
globalThis.fetch = () => Promise.resolve({
  ok: true, status: 200,
  text: () => Promise.resolve(JSON.stringify(bootJson)),
  json: () => Promise.resolve(bootJson),
});

process.on('uncaughtException', (e) => {
  console.log('UNCAUGHT:', e.message);
  console.log(String(e.stack || '').split('\n').slice(0, 6).join('\n'));
});

new Function(APP_JS)();
setTimeout(() => {
  console.log('rendered. rail html length =', (cache.get('rail') || {}).innerHTML ? cache.get('rail').innerHTML.length : 0);
  const m = cache.get('s-model');
  console.log('s-model html length =', m ? String(m.innerHTML).length : 'missing');
}, 300);
