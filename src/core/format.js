// Format readers/writers. No dependencies: we only ever emit structures we own.

/** Strip // and /* *\/ comments plus trailing commas from JSONC, respecting strings. */
export function stripJsonc(src) {
  let out = '';
  let i = 0;
  const s = String(src);
  while (i < s.length) {
    const c = s[i];
    if (c === '"') {
      out += c; i++;
      while (i < s.length) {
        out += s[i];
        if (s[i] === '\\') { out += s[i + 1] ?? ''; i += 2; continue; }
        if (s[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

export function parseJsonc(src, fallback = {}) {
  const text = String(src ?? '').trim();
  if (!text) return fallback;
  return JSON.parse(stripJsonc(text));
}

export function stringifyJson(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

export function hasComments(src) {
  const noStrings = String(src ?? '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return /(^|[^:])\/\/|\/\*/.test(noStrings);
}

// ---------------------------------------------------------------- TOML

export function tomlValue(v) {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '0';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return '[' + v.map(tomlValue).join(', ') + ']';
  throw new Error('unsupported TOML value: ' + typeof v);
}

function tomlFlattenPairs(obj) {
  const flat = [];
  const nested = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) nested.push([k, v]);
    else flat.push([k, v]);
  }
  return { flat, nested };
}

function tomlTableLines(name, obj) {
  const { flat, nested } = tomlFlattenPairs(obj);
  const lines = ['[' + name + ']'];
  for (const [k, v] of flat) lines.push(`${k} = ${tomlValue(v)}`);
  for (const [k, v] of nested) {
    lines.push('');
    lines.push(...tomlTableLines(name + '.' + k, v));
  }
  return lines;
}

/** Split TOML text into root lines and named table segments (verbatim). */
export function tomlSegments(src) {
  const lines = String(src ?? '').replace(/\r\n/g, '\n').split('\n');
  const segs = [{ name: null, lines: [] }];
  let cur = segs[0];
  let inMultiline = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('"""') || t.startsWith("'''")) inMultiline = !inMultiline;
    const m = !inMultiline && /^\[\[?([^\]]+)\]\]?\s*(#.*)?$/.exec(t);
    if (m) {
      cur = { name: m[1].trim(), lines: [line] };
      segs.push(cur);
    } else {
      cur.lines.push(line);
    }
  }
  return segs;
}

/**
 * Set root keys and (re)write whole tables.
 * tables: { "model_providers.acme": { name: "...", base_url: "..." } }
 */
export function tomlSet(src, { root = {}, tables = {}, removeTables = [] } = {}) {
  let segs = tomlSegments(src);
  const drop = new Set([...Object.keys(tables), ...removeTables]);

  // root keys
  const rootSeg = segs[0];
  for (const [k, v] of Object.entries(root)) {
    const re = new RegExp('^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=');
    const idx = rootSeg.lines.findIndex((l) => re.test(l));
    const rendered = `${k} = ${tomlValue(v)}`;
    if (idx >= 0) rootSeg.lines[idx] = rendered;
    else rootSeg.lines.push(rendered);
  }
  // collapse duplicate blank lines at end of root
  while (rootSeg.lines.length && rootSeg.lines[rootSeg.lines.length - 1].trim() === '') rootSeg.lines.pop();

  segs = segs.filter((s) => s.name === null || !drop.has(s.name));
  const out = [];
  for (const s of segs) {
    if (out.length && out[out.length - 1].trim() !== '') out.push('');
    out.push(...s.lines);
  }
  const body = out.join('\n').replace(/\n{3,}$/g, '\n\n');
  const blocks = Object.entries(tables).map(([name, obj]) => tomlTableLines(name, obj).join('\n'));
  const merged = [body.replace(/\n+$/, ''), ...blocks].filter((x) => x.trim() !== '').join('\n\n');
  return merged.replace(/^\n+/, '') + '\n';
}

// ---------------------------------------------------------------- YAML

export function yamlScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (s === '') return '""';
  if (/^[A-Za-z0-9_./:@\-]+$/.test(s) && !/^(true|false|null|yes|no|on|off|~)$/i.test(s) && !/^\d/.test(s)) return s;
  return JSON.stringify(s);
}

/** Render a block mapping/list for `key:` at the given indent. */
export function yamlKeyBlock(key, value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return [`${pad}${key}: []`];
    const lines = [`${pad}${key}:`];
    for (const item of value) lines.push(...yamlItem(item, indent + 2));
    return lines;
  }
  if (value && typeof value === 'object') {
    const lines = [`${pad}${key}:`];
    for (const [k, v] of Object.entries(value)) lines.push(...yamlKeyBlock(k, v, indent + 2));
    return lines;
  }
  return [`${pad}${key}: ${yamlScalar(value)}`];
}

function yamlItem(item, indent) {
  if (item && typeof item === 'object' && !Array.isArray(item)) return rebuildListItem(item, indent);
  return [' '.repeat(indent) + '- ' + yamlScalar(item)];
}

function rebuildListItem(obj, indent) {
  const pad = ' '.repeat(indent);
  const entries = Object.entries(obj);
  const out = [];
  entries.forEach(([k, v], i) => {
    const inner = indent + 2;
    const lines = yamlKeyBlock(k, v, inner);
    if (i === 0) {
      const firstLine = lines[0];
      out.push(pad + '- ' + firstLine.slice(inner));
      out.push(...lines.slice(1));
    } else {
      out.push(...lines);
    }
  });
  return out;
}

/**
 * Replace a top-level YAML key (its whole indented block) with new lines.
 * Everything else stays byte-identical.
 */
export function yamlSetTop(src, key, value) {
  const lines = String(src ?? '').replace(/\r\n/g, '\n').split('\n');
  const block = yamlKeyBlock(key, value, 0);
  const re = new RegExp('^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) { start = i; break; }
  }
  if (start === -1) {
    const body = lines.join('\n').replace(/\n+$/, '');
    return (body ? body + '\n' : '') + block.join('\n') + '\n';
  }
  let end = start + 1;
  while (end < lines.length) {
    const l = lines[end];
    if (l.trim() === '') { end++; continue; }
    if (/^\s/.test(l)) { end++; continue; }
    break;
  }
  // do not swallow trailing blank lines
  while (end > start + 1 && lines[end - 1].trim() === '') end--;
  const out = [...lines.slice(0, start), ...block, ...lines.slice(end)];
  return out.join('\n');
}

/** Flat `key: value` YAML (aider style): set or append single keys. */
export function yamlSetFlat(src, pairs) {
  const lines = String(src ?? '').replace(/\r\n/g, '\n').split('\n');
  const appended = [];
  for (const [k, v] of Object.entries(pairs)) {
    const re = new RegExp('^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:');
    const idx = lines.findIndex((l) => re.test(l));
    const rendered = `${k}: ${yamlScalar(v)}`;
    if (idx >= 0) lines[idx] = rendered;
    else appended.push(rendered);
  }
  const head = lines.join('\n').replace(/\n+$/, '');
  if (!appended.length) return head + '\n';
  const joined = (head ? head + '\n' : '') + appended.join('\n');
  return joined + '\n';
}

/** Bash managed block for crushrc-style configs. */
export function bashManagedBlock(src, tag, bodyLines) {
  const begin = `# >>> ${tag} >>>`;
  const end = `# <<< ${tag} <<<`;
  const text = String(src ?? '');
  const i = text.indexOf(begin);
  const j = text.indexOf(end);
  const block = [begin, ...bodyLines, end].join('\n');
  if (i >= 0 && j > i) return text.slice(0, i) + block + text.slice(j + end.length);
  const body = text.replace(/\n+$/, '');
  return (body ? body + '\n\n' : '') + block + '\n';
}
