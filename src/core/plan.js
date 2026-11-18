import { ADAPTERS, adapterById } from '../adapters/index.js';
import { resolveEndpoint } from './ir.js';
import { readSafe, expand } from './fsx.js';
import { unified } from './util.js';

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function buildPlan(state, opts = {}) {
  const wanted = opts.tools && opts.tools.length ? new Set(opts.tools) : null;
  const items = [];

  for (const adapter of ADAPTERS) {
    if (wanted && !wanted.has(adapter.id)) continue;
    const assignment = state.assignments[adapter.id];
    if (!assignment) continue;
    items.push(planOne(state, adapter, assignment, opts));
  }
  return {
    generatedAt: new Date().toISOString(),
    gateway: { ...state.gateway, apiKey: state.gateway?.apiKey ? '****' : '' },
    items,
    summary: summarize(items),
  };
}

export function planOne(state, adapter, assignment, opts = {}) {
  const base = {
    toolId: adapter.id,
    toolName: adapter.name,
    group: adapter.group,
    writable: adapter.writable || 'auto',
    docs: adapter.docs,
    note: adapter.note || '',
    files: [],
    warnings: [],
    guide: [],
    error: null,
    artifact: null,
  };
  try {
    const resolved = resolveEndpoint(state, assignment, adapter);
    const factor = Number(state.settings?.contextFactor) || 0.95;
    const rawCtx = Number(resolved.model?.contextWindow) || 0;
    const ctx = {
      state,
      assignment,
      adapter,
      provider: resolved.provider,
      model: resolved.model,
      resolved,
      contextFactor: factor,
      channelName: state.settings?.channelName || 'example公司',
      contextCap: rawCtx ? Math.round(rawCtx * factor) : 0,
      read: (p) => safeRead(p),
      expand,
    };
    const out = adapter.render(ctx) || {};
    const overridePath = state.overrides && state.overrides[adapter.id];
    if (overridePath && out.files && out.files.length) {
      out.files = [{ ...out.files[0], path: overridePath }, ...out.files.slice(1)];
    }
    const files = (out.files || []).map((f) => {
      const cur = safeRead(f.path);
      const before = cur.exists ? cur.text : (f.before ?? '');
      const after = f.after ?? before;
      const changed = before !== after;
      return {
        path: expand(f.path),
        note: f.note || '',
        isNew: !cur.exists,
        before,
        after,
        beforeHash: hash(before),
        changed,
        diff: changed ? unified(before, after, expand(f.path)) : '',
      };
    });
    return {
      ...base,
      files,
      warnings: [...(out.warnings || []), ...(resolved.warnings || [])],
      guide: out.guide || [],
      artifact: out.artifact || null,
      guided: !!out.guided,
      resolved: {
        protocol: resolved.protocol,
        baseUrl: resolved.baseUrl,
        viaGateway: resolved.viaGateway,
        modelId: resolved.model?.id || '',
      },
    };
  } catch (e) {
    return { ...base, error: e.message };
  }
}

function safeRead(p) {
  try {
    return readSafe(p);
  } catch (e) {
    return { exists: false, text: '' };
  }
}

function summarize(items) {
  let files = 0, changed = 0, blocked = 0, guided = 0, errors = 0;
  for (const it of items) {
    if (it.error) { errors++; continue; }
    if (it.guided || !it.files.length) guided++;
    for (const f of it.files) {
      files++;
      if (f.changed) changed++;
    }
    blocked += it.warnings.length;
  }
  return { tools: items.length, files, changed, guided, errors, warnings: blocked };
}

export { hash };
