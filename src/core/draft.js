// The JSON draft is the only thing the user reviews before anything is written.
// It never contains secrets: keys stay in state.json.

import fs from 'node:fs';
import path from 'node:path';
import { aacHome, ensureDir, setProfile, profileName } from './fsx.js';
import { buildPlan } from './plan.js';
import { applyPlan } from './apply.js';
import { ENDPOINT_CANDIDATES, TIERS } from './steps.js';
import { adapterById } from '../adapters/index.js';
import { findProvider, normalizeProvider, saveState } from './ir.js';
import { mask } from './util.js';

import { guessContext, contextCap } from './context.js';
export { guessContext, contextCap };

export function draftsDir() {
  return ensureDir(path.join(aacHome(), 'drafts'));
}

export function buildDraft(state) {
  const settings = state.settings || {};
  const plan = buildPlan(state, { tools: Object.keys(state.assignments || {}) });
  const primary = state.providers[0] || null;
  const factor = Number.isFinite(Number(settings.contextFactor)) ? Number(settings.contextFactor) : 0.95;
  const tier = settings.tier || '';

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    profile: profileName(),
    settings: {
      endpoint: settings.endpoint || '',
      endpointCandidates: (settings.endpointCandidates && settings.endpointCandidates.length
        ? settings.endpointCandidates
        : ENDPOINT_CANDIDATES).map((e) => ({ id: e.id, label: e.label, url: e.url })),
      tier,
      tierNote: (TIERS.find((t) => t.id === tier) || {}).note || '',
      contextFactor: factor,
      gateway: {
        enabled: !!(state.gateway && state.gateway.enabled),
        baseUrl: state.gateway?.baseUrl || '',
        protocols: state.gateway?.protocols || [],
      },
      imageChannel: {
        enabled: !!settings.imageChannel,
        model: settings.imageModel || 'gpt-image-2',
      },
    },
    provider: primary
      ? {
          id: primary.id,
          name: primary.name,
          protocol: primary.protocol,
          protocols: primary.protocols || [primary.protocol],
          baseUrl: primary.baseUrl,
          apiKeyMasked: mask(primary.apiKey),
          apiKeyEnv: primary.apiKeyEnv || '',
          headers: primary.headers || {},
          models: (primary.models || []).map((m) => ({
            id: m.id,
            contextWindow: Number(m.contextWindow) || guessContext(m.id),
            contextCap: contextCap(m, factor),
            estimated: !Number(m.contextWindow),
          })),
        }
      : null,
    assignments: Object.fromEntries(
      Object.entries(state.assignments || {}).map(([k, v]) => [k, { providerId: v.providerId, modelId: v.modelId || '' }])
    ),
    tools: plan.items.map((it) => ({
      id: it.toolId,
      name: it.toolName,
      group: it.group,
      writable: it.writable,
      accepts: adapterById(it.toolId)?.accepts || [],
      resolved: it.resolved || null,
      error: it.error,
      files: it.files.map((f) => ({ path: f.path, isNew: f.isNew, changed: f.changed, note: f.note })),
      warnings: it.warnings,
      guide: it.guide,
    })),
    summary: plan.summary,
  };
}

export function validateDraft(draft, state) {
  const errors = [];
  const warnings = [];
  if (!draft || typeof draft !== 'object') return { ok: false, errors: ['draft 不是对象'], warnings };

  if (draft.version !== 1) errors.push(`version 必须是 1，当前 ${draft.version}`);
  const s = draft.settings || {};
  const factor = Number(s.contextFactor);
  if (!Number.isFinite(factor) || factor < 0.5 || factor > 1) {
    errors.push('settings.contextFactor 必须在 0.5 – 1.0 之间（默认 0.95）');
  }
  if (s.endpoint && !/^https?:\/\//.test(String(s.endpoint))) {
    errors.push('settings.endpoint 必须是 http(s) 地址');
  }
  if (s.endpointCandidates && !Array.isArray(s.endpointCandidates)) {
    errors.push('settings.endpointCandidates 必须是数组');
  }
  const p = draft.provider;
  if (!p) errors.push('provider 缺失：先在步骤 2 保存供应商');
  else {
    if (!p.baseUrl || !/^https?:\/\//.test(p.baseUrl)) errors.push('provider.baseUrl 必须是 http(s) 地址');
    if (!Array.isArray(p.models) || !p.models.length) errors.push('provider.models 不能为空');
    for (const m of p.models || []) {
      if (!m.id) errors.push('provider.models[].id 不能为空');
      if (m.contextCap !== undefined && (!Number.isFinite(Number(m.contextCap)) || Number(m.contextCap) <= 0)) {
        warnings.push(`模型 ${m.id} 的 contextCap 无效，将回退到自动计算`);
      }
    }
  }
  const modelIds = new Set(((p && p.models) || []).map((m) => m.id));
  for (const [toolId, a] of Object.entries(draft.assignments || {})) {
    if (!adapterById(toolId)) errors.push(`未知工具：${toolId}`);
    if (!a || !a.providerId) errors.push(`${toolId} 的分配缺少 providerId`);
    if (a && a.modelId && modelIds.size && !modelIds.has(a.modelId)) {
      warnings.push(`${toolId} 的模型 ${a.modelId} 不在 provider.models 里，将按原样写入`);
    }
  }
  const tools = draft.tools || [];
  for (const t of tools) {
    if (t.error) errors.push(`${t.name || t.id}：${t.error}`);
  }
  if (!Object.keys(draft.assignments || {}).length) warnings.push('还没有勾选任何工具');

  return { ok: errors.length === 0, errors, warnings };
}

export function saveDraftFile(draft) {
  const dir = draftsDir();
  const name = `draft-${draft.generatedAt.replace(/[:.]/g, '-')}.json`;
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(draft, null, 2) + '\n', 'utf8');
  return { name, path: p };
}

export function listDrafts(limit = 30) {
  const dir = draftsDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      return { name: f, size: st.size, mtime: st.mtime.toISOString() };
    })
    .sort((a, b) => (a.mtime < b.mtime ? 1 : -1))
    .slice(0, limit);
}

export function readDraftFile(name) {
  const safe = path.basename(String(name));
  const p = path.join(draftsDir(), safe);
  if (!fs.existsSync(p)) throw new Error('draft not found: ' + safe);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Apply the reviewed draft: state first, then the real files. */
export function applyDraft(state, draft, { dryRun = false } = {}) {
  const check = validateDraft(draft, state);
  if (!check.ok) return { ok: false, ...check };

  const s = draft.settings || {};
  state.settings = state.settings || {};
  state.settings.endpoint = s.endpoint || state.settings.endpoint;
  state.settings.contextFactor = Number(s.contextFactor) || 0.95;
  if (typeof s.tier === 'string') state.settings.tier = s.tier;
  if (typeof s.imageChannel === 'object') {
    state.settings.imageChannel = !!s.imageChannel.enabled;
    state.settings.imageModel = s.imageChannel.model || 'gpt-image-2';
  }
  if (s.gateway) {
    state.gateway = { ...state.gateway, ...s.gateway };
  }

  // provider model list (context caps + ids) may be edited in the draft
  const primary = state.providers[0];
  if (primary && draft.provider && draft.provider.id === primary.id) {
    primary.models = (draft.provider.models || []).map((m) => ({
      id: m.id,
      label: m.label,
      contextWindow: Number(m.contextWindow) || guessContext(m.id),
      tools: true,
    }));
    if (draft.provider.baseUrl) primary.baseUrl = draft.provider.baseUrl;
    if (draft.provider.protocol) primary.protocol = draft.provider.protocol;
    if (Array.isArray(draft.provider.protocols) && draft.provider.protocols.length) {
      primary.protocols = draft.provider.protocols.filter((x) => ['openai-chat','openai-responses','anthropic','gemini'].includes(x));
    }
  }

  // assignments come from the draft
  state.assignments = {};
  for (const [toolId, a] of Object.entries(draft.assignments || {})) {
    if (!a || !a.providerId) continue;
    state.assignments[toolId] = { providerId: a.providerId, modelId: a.modelId || '' };
  }

  if (dryRun) {
    const plan = buildPlan(state, {});
    return { ok: true, dryRun: true, plan, warnings: check.warnings };
  }

  saveState(state);
  const saved = saveDraftFile(draft);
  const plan = buildPlan(state, {});
  const out = applyPlan(state, { plan });
  state.runs = state.runs || {};
  state.runs.lastDraft = { ok: true, at: new Date().toISOString(), summary: plan.summary, file: saved.name };
  state.runs.lastApply = { at: new Date().toISOString(), results: out.results };
  saveState(state);
  return { ok: true, plan, results: out.results, draftFile: saved.name, warnings: check.warnings };
}

export { normalizeProvider, findProvider, setProfile };
