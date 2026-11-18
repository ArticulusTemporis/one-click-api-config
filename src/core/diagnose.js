// Latency + capability probes. Everything here is a real HTTP request:
// "green" in the UI must mean an endpoint actually answered.

import { ENDPOINT_CANDIDATES } from './steps.js';
import { resolveEndpoint } from './ir.js';
import { urlBase } from './util.js';
import { adapterById } from '../adapters/index.js';

const T = 15000;

async function timed(fn) {
  const t0 = Date.now();
  try {
    const v = await fn();
    return { ok: true, ms: Date.now() - t0, ...v };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: String(e.message || e) };
  }
}

function headers(key) {
  return {
    'content-type': 'application/json',
    ...(key ? { authorization: 'Bearer ' + key } : {}),
  };
}

/**
 * Latency probe hits the site root only: no path, no /v1, no key.
 * What we measure is "can this host answer at all", which is what a user
 * choosing between two entrances actually wants to know.
 */
export async function measureEndpoint(ep, apiKey) {
  const root = String(ep.url || '').replace(/\/+$/, '');
  return timed(async () => {
    const r = await fetch(root + '/', {
      method: 'GET',
      headers: { accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(T),
      redirect: 'follow',
    });
    const ok = r.status < 500;
    return { ok, reachable: true, status: r.status, models: [], count: 0,
      error: ok ? null : ('HTTP ' + r.status) };
  });
}

/** Minimal chat call per protocol. Proves the model actually answers. */
export async function probeModel({ protocol, baseUrl, apiKey, model, maxTokens = 16 }) {
  return timed(async () => {
    if (!model) throw new Error('no model id');
    if (protocol === 'anthropic') {
      const r = await fetch(urlBase(baseUrl, 'root') + '/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: 'ping' }] }),
        signal: AbortSignal.timeout(T),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0, 160)}`);
      return { sample: text.slice(0, 120) };
    }
    if (protocol === 'openai-responses') {
      const r = await fetch(urlBase(baseUrl, 'v1') + '/responses', {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({ model, input: 'ping', max_output_tokens: maxTokens }),
        signal: AbortSignal.timeout(T),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0, 160)}`);
      return { sample: text.slice(0, 120) };
    }
    if (protocol === 'gemini') {
      const root = urlBase(baseUrl, 'root');
      const r = await fetch(`${root}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey || '')}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: maxTokens } }),
        signal: AbortSignal.timeout(T),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0, 160)}`);
      return { sample: text.slice(0, 120) };
    }
    const r = await fetch(urlBase(baseUrl, 'v1') + '/chat/completions', {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: maxTokens }),
      signal: AbortSignal.timeout(T),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0, 160)}`);
    return { sample: text.slice(0, 120) };
  });
}

/** One tiny image, proves an image channel really renders. */
export async function probeImage({ baseUrl, apiKey, model = 'gpt-image-2' }) {
  return timed(async () => {
    const r = await fetch(urlBase(baseUrl, 'v1') + '/images/generations', {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({ model, prompt: 'a red dot', n: 1, size: '1024x1024' }),
      signal: AbortSignal.timeout(60000),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0, 160)}`);
    const j = JSON.parse(text);
    const url = j.data?.[0]?.url || j.data?.[0]?.b64_json;
    return { hasImage: !!url, sample: text.slice(0, 100) };
  });
}

export async function diagnose(state, opts = {}) {
  const primary = state.providers[0] || null;
  const apiKey = primary?.apiKey || '';
  const endpoints = (opts.endpoints || ENDPOINT_CANDIDATES).map((e) => ({ ...e }));
  const endpointResults = [];
  for (const ep of endpoints) {
    const r = await measureEndpoint(ep, apiKey);
    endpointResults.push({ id: ep.id, label: ep.label, url: ep.url, ...r });
  }
  const score = (e) => (e.ok ? 0 : e.reachable ? 1 : 2);
  endpointResults.sort((a, b) => {
    const d = score(a) - score(b);
    return d !== 0 ? d : a.ms - b.ms;
  });

  const models = opts.models || (primary?.models || []).map((m) => m.id);
  const modelResults = [];
  if (primary && models.length) {
    for (const id of models.slice(0, 6)) {
      const r = await probeModel({
        protocol: primary.protocol,
        baseUrl: primary.baseUrl,
        apiKey: primary.apiKey,
        model: id,
      });
      modelResults.push({ model: id, ...r });
    }
  }

  const toolResults = [];
  const wantsTools = opts.tools && opts.tools.length ? new Set(opts.tools) : null;
  for (const [toolId, assignment] of Object.entries(state.assignments || {})) {
    if (wantsTools && !wantsTools.has(toolId)) continue;
    const adapter = adapterById(toolId);
    if (!adapter || adapter.writable === 'guided') continue;
    try {
      const resolved = resolveEndpoint(state, assignment, adapter);
      const r = await probeModel({
        protocol: resolved.protocol,
        baseUrl: resolved.baseUrl,
        apiKey: resolved.apiKey || '',
        model: resolved.model?.id,
      });
      toolResults.push({
        toolId,
        toolName: adapter.name,
        protocol: resolved.protocol,
        baseUrl: resolved.baseUrl,
        model: resolved.model?.id,
        viaGateway: resolved.viaGateway,
        ...r,
      });
    } catch (e) {
      toolResults.push({ toolId, toolName: adapter.name, ok: false, error: String(e.message || e) });
    }
  }

  return {
    at: new Date().toISOString(),
    endpoints: endpointResults,
    models: modelResults,
    tools: toolResults,
    fastest: endpointResults.find((e) => e.ok) || endpointResults.find((e) => e.reachable) || null,
  };
}
