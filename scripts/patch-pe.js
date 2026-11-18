// Switch a PE between console (3) and GUI (2) subsystem.
// GUI means double-clicking shows no black console window.
//
// Usage: node scripts/patch-pe.js dist/aac.exe gui|console

import fs from 'node:fs';

const file = process.argv[2] || 'dist/aac.exe';
const mode = (process.argv[3] || 'gui').toLowerCase();
const value = mode === 'console' ? 3 : 2;

const buf = fs.readFileSync(file);
if (buf.toString('latin1', 0, 2) !== 'MZ') throw new Error('not a PE file');

const peOff = buf.readUInt32LE(0x3c);
if (buf.toString('latin1', peOff, peOff + 4) !== 'PE\u0000\u0000') throw new Error('missing PE signature');

const optOff = peOff + 24;
const magic = buf.readUInt16LE(optOff);
if (magic !== 0x10b && magic !== 0x20b) throw new Error('unknown optional header magic: ' + magic);

// Subsystem sits at offset 68 in both PE32 and PE32+ optional headers.
const subOff = optOff + 68;
const before = buf.readUInt16LE(subOff);
buf.writeUInt16LE(value, subOff);

// Clear the console-only "console app" characteristics bit if present (0x0004 is
// not defined for images; leave Characteristics untouched). Also keep checksum
// stale-tolerant: Windows ignores it for user-mode images.
fs.writeFileSync(file, buf);
console.log(`subsystem ${before} -> ${value} (${value === 2 ? 'GUI, no console window' : 'console'})`);
