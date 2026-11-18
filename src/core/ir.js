import fs from 'node:fs';
import path from 'node:path';
import { aacHome, statePath, ensureDir, readSafe, atomicWrite } from './fsx.js';
import { urlBase, sameBase, PROTOCOLS, slug } from './util.js';

export const STATE_VERSION = 2;

export function emptyState() {
  return {
    version: STATE_VERSION,
    gateway: {
      enabled: false,
      kind: 'litellm',
      baseUrl: 'http://127.0.0.1:4000',
      protocols: ['openai-chat', 'openai-responses', 'anthropic'],
      apiKey: 'sk-litellm-master',
      apiKeyEnv: 'LITELLM_MASTER_KEY',
    },
    providers: [],
    assignments: {},
    sites: {},
    overrides: {},
    settings: {
      reloadHints: true,
      endpoint: '',
      endpointCandidates: [],
      tier: '',
      contextFactor: 0.95,
      channelName: 'example公司',
      imageChannel: false,
      imageModel: 'gpt-image-2',
      doneFirstRun: false,
    },
    runs: {},
  };
}

export function loadState() {
  const p = statePath();
  const { exists, text } = readSafe(p);
  if (!exists || !text.trim()) return emptyState();
  const st = JSON.parse(text);
  const base = emptyState();
  return {
    version: STATE_VERSION,
    ...base,
    ...st,
    gateway: { ...base.gateway, ...(st.gateway || {}) },
    settings: { ...base.settings, ...(st.settings || {}) },
    runs: st.runs && typeof st.runs === 'object' ? st.runs : {},
    sites: st.sites && typeof st.sites === 'object' ? st.sites : {},
    overrides: st.overrides && typeof st.overrides === 'object' ? st.overrides : {},
    providers: Array.isArray(st.providers) ? st.providers : [],
    assignments: st.assignments && typeof st.assignments === 'object' ? st.assignments : {},
  };
}

export function saveState(state) {
  ensureDir(aacHome());
  atomicWrite(statePath(), JSON.stringify(state, null, 2) + '\n');
  return state;
}

export function validateProvider(p) {
  const errs = [];
  if (!p || typeof p !== 'object') return ['provider must be an object'];
  if (!p.id || typeof p.id !== 'string') errs.push('id is required');
  if (!PROTOCOLS.includes(p.protocol)) errs.push(`protocol must be one of ${PROTOCOLS.join(', ')}`);
  if (!p.baseUrl || !/^https?:\/\//i.test(p.baseUrl)) errs.push('baseUrl must be http(s) URL');
  if (!Array.isArray(p.models) || !p.models.length) errs.push('models must be a non-empty array');
  return errs;
}

export function normalizeProvider(p) {
  const models = (p.models || [])
    .map((m) => (typeof m === 'string' ? { id: m } : m))
    .filter((m) => m && m.id)
    .map((m) => ({
      id: String(m.id),
      label: m.label ? String(m.label) : undefined,
      contextWindow: Number(m.contextWindow) || undefined,
      tools: m.tools === undefined ? true : !!m.tools,
    }));
  const protocols = Array.isArray(p.protocols) && p.protocols.length
    ? p.protocols.filter((x) => PROTOCOLS.includes(x))
    : [p.protocol].filter(Boolean);
  return {
    id: slug(p.id),
    name: p.name || p.id,
    protocol: p.protocol || protocols[0],
    protocols: protocols.length ? protocols : ['openai-chat'],
    baseUrl: String(p.baseUrl).replace(/\/+$/, ''),
    apiKey: p.apiKey || '',
    apiKeyEnv: (p.apiKeyEnv || '').trim() || undefined,
    headers: p.headers && typeof p.headers === 'object' ? p.headers : {},
    models,
    notes: p.notes || '',
  };
}

export function upsertProvider(state, raw) {
  const p = normalizeProvider(raw);
  const errs = validateProvider(p);
  if (errs.length) throw new Error(errs.join('; '));
  const idx = state.providers.findIndex((x) => x.id === p.id);
  if (idx >= 0) state.providers[idx] = { ...state.providers[idx], ...p };
  else state.providers.push(p);
  return p;
}

export function findProvider(state, id) {
  return state.providers.find((p) => p.id === id);
}

export function findModel(provider, modelId) {
  if (!provider) return null;
  if (!modelId) return provider.models[0] || null;
  return provider.models.find((m) => m.id === modelId) || { id: modelId, tools: true };
}

/**
 * Decide which endpoint + protocol a client actually talks to.
 * gateway wins when the client cannot speak the provider's protocol.
 */
export function resolveEndpoint(state, assignment, adapter) {
  const warnings = [];
  if (!assignment) throw new Error('no assignment');
  const provider = findProvider(state, assignment.providerId);
  if (!provider) throw new Error(`provider not found: ${assignment.providerId}`);
  const model = findModel(provider, assignment.modelId);
  const accepts = adapter.accepts || [];
  const gw = state.gateway || {};
  const providerProtocols = Array.isArray(provider.protocols) && provider.protocols.length
    ? provider.protocols
    : [provider.protocol];

  const directProtocol = accepts.find((a) => providerProtocols.includes(a));
  const direct = !!directProtocol;
  let chosen = provider;
  let viaGateway = false;
  let protocol = provider.protocol;

  if (!direct) {
    const gwProtocols = Array.isArray(gw.protocols) ? gw.protocols : [gw.protocol || 'openai-chat'];
    const usable = accepts.find((a) => gwProtocols.includes(a));
    if (!gw.enabled || !usable) {
      throw new Error(
        `${adapter.name} does not speak ${provider.protocol}` +
        (gw.enabled ? ` and the gateway exposes ${gwProtocols.join(', ')}` : ' and the gateway is off') +
        `. Needed by this client: ${accepts.join(' / ')}.`
      );
    }
    chosen = { id: gw.kind || 'gateway', baseUrl: gw.baseUrl, apiKey: gw.apiKey, apiKeyEnv: gw.apiKeyEnv };
    viaGateway = true;
    protocol = usable;
    warnings.push(`routed through local gateway ${gw.baseUrl} (${usable})`);
  }

  if (direct) protocol = directProtocol;
  const baseStyle = adapter.baseStyle || 'v1';
  const baseUrl = urlBase(chosen.baseUrl, baseStyle);
  if (viaGateway && model && model.id) {
    warnings.push(`gateway must expose this model id: ${model.id}`);
  }
  return {
    provider,
    model,
    viaGateway,
    protocol,
    baseUrl,
    style: baseStyle,
    apiKey: chosen.apiKey || '',
    apiKeyEnv: chosen.apiKeyEnv || '',
    warnings,
  };
}

/** Human readable status per tool, used by CLI + web UI. */
export function assignSummary(state, assignment) {
  if (!assignment) return { assigned: false };
  const p = findProvider(state, assignment.providerId);
  return {
    assigned: true,
    providerId: assignment.providerId,
    providerName: p ? p.name : assignment.providerId,
    protocol: p ? p.protocol : '?',
    modelId: assignment.modelId || '',
    viaGateway: !!(state.gateway?.enabled && p && !(p.protocol === 'openai-chat' && (state.gateway.protocols || []).includes('openai-chat'))),
  };
}

export function defaultStatePath() {
  return statePath();
}

export function homeDir() {
  return aacHome();
}

export { statePath } from './fsx.js';

export function dirOf(p) {
  return path.dirname(p);
}
