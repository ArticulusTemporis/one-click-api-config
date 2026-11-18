import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';
import { spawn } from 'node:child_process';
import { ADAPTERS, adapterById, toolCatalog, CATEGORIES } from './adapters/index.js';
import {
  loadState, saveState, upsertProvider, findProvider, homeDir, statePath,
} from './core/ir.js';
import { buildPlan } from './core/plan.js';
import { applyPlan } from './core/apply.js';
import {
  buildDraft, validateDraft, applyDraft, listDrafts, readDraftFile,
} from './core/draft.js';
import { diagnose, probeModel, probeImage } from './core/diagnose.js';
import { steps, stepSummary, TIERS, ENDPOINT_CANDIDATES } from './core/steps.js';
import { login, fetchMe, fetchKeys, fetchGroups, fetchModelsForKey, maskKey } from './core/site.js';
import { readSessionFromBrowser, profileDirs } from './core/browser.js';
import { locate } from './core/locate.js';
import { scan as autoScan, run as autoRun, networkCheck } from './core/auto.js';
import { quickNet } from './core/netcheck.js';
import { PLUGINS } from './core/plugins.js';
import { guessContext, contextCap } from './core/draft.js';
import { listBackups, rollbackStamp, statePath as sp, profileName, setProfile, ensureDir } from './core/fsx.js';
import { mask, urlBase } from './core/util.js';
import { HTML, CSS, APP_JS } from './web/assets.js';

const HOST = '127.0.0.1';
const BUILD_VER = String(Date.now()).slice(-6);

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${HOST}`);
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return send(res, 200, 'text/html; charset=utf-8', HTML.replace('__CSS__', CSS).replace('__VER__', BUILD_VER));
      }
      if (url.pathname === '/app.js') return send(res, 200, 'text/javascript; charset=utf-8', APP_JS);
      if (url.pathname === '/m3.css') return send(res, 200, 'text/css; charset=utf-8', CSS);
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return send(res, 404, 'text/plain', 'not found');
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  });
}

function endpointsOf(state) {
  const list = (state.settings?.endpointCandidates || []).filter((e) => e && e.url);
  return list.length ? list : ENDPOINT_CANDIDATES.map((e) => ({ id: e.id, label: e.label, url: e.url }));
}

function resolveModel(state) {
  const p = state.providers[0];
  if (!p) return '';
  const tier = TIERS.find((t) => t.id === state.settings?.tier);
  if (tier && p.models.some((m) => m.id === tier.model)) return tier.model;
  if (state.settings?.tierModel && p.models.some((m) => m.id === state.settings.tierModel)) return state.settings.tierModel;
  return p.models[0]?.id || '';
}

async function api(req, res, url) {
  const state = loadState();
  const p = url.pathname;
  const m = req.method;

  if (p === '/api/bootstrap' && m === 'GET') {
    const draft = buildDraft(state);
    const list = steps(state);
    return json(res, {
      profile: profileName(),
      home: homeDir(),
      statePath: statePath(),
      platform: process.platform,
      node: process.version,
      settings: { ...state.settings, tierModel: resolveModel(state) },
      endpoints: endpointsOf(state),
      tiers: TIERS,
      tools: toolCatalog(),
      providers: state.providers.map(publicProvider),
      assignments: state.assignments,
      gateway: { ...state.gateway, apiKey: mask(state.gateway.apiKey) },
      draft,
      drafts: listDrafts(12),
      backups: listBackups(60),
      steps: list,
      stepSummary: stepSummary(list),
      lastDiagnose: state.runs?.lastDiagnose || null,
      lastApply: state.runs?.lastApply || null,
      site: siteInfo(state),
      keys: maskedKeys(state),
      agents: agentCatalog(state),
      categories: CATEGORIES,
      browserProfiles: profileDirs().length,
      introSeen: !!(state.settings && state.settings.seenIntro),
    });
  }

  if (p === '/api/endpoint' && m === 'POST') {
    const body = await bodyOf(req);
    if (!body.url || !/^https?:\/\//.test(body.url)) return json(res, { error: 'bad url' }, 400);
    state.settings = state.settings || {};
    state.settings.endpoint = String(body.url).replace(/\/+$/, '');
    state.settings.endpointManual = true;
    if (!state.settings.endpointCandidates?.length) {
      state.settings.endpointCandidates = ENDPOINT_CANDIDATES.map((e) => ({ id: e.id, label: e.label, url: e.url }));
    }
    const prim = state.providers[0];
    if (prim) prim.baseUrl = state.settings.endpoint;
    saveState(state);
    return json(res, { ok: true });
  }

  if (p === '/api/tier' && m === 'POST') {
    const body = await bodyOf(req);
    const tier = TIERS.find((t) => t.id === body.tier);
    if (!tier) return json(res, { error: 'unknown tier' }, 400);
    state.settings = state.settings || {};
    state.settings.tier = tier.id;
    state.settings.tierModel = tier.model;
    const prim = state.providers[0];
    if (prim && !prim.models.some((x) => x.id === tier.model)) {
      prim.models.push({ id: tier.model, contextWindow: 0, tools: true });
    }
    if (prim) {
      for (const toolId of Object.keys(state.assignments || {})) {
        state.assignments[toolId] = { providerId: prim.id, modelId: tier.model };
      }
    }
    saveState(state);
    return json(res, { ok: true });
  }

  if (p === '/api/settings' && m === 'POST') {
    const body = await bodyOf(req);
    state.settings = state.settings || {};
    if (body.contextFactor !== undefined) {
      const f = Number(body.contextFactor);
      if (!Number.isFinite(f) || f < 0.5 || f > 1) return json(res, { error: 'contextFactor 必须在 0.5–1' }, 400);
      state.settings.contextFactor = f;
    }
    if (body.imageChannel !== undefined) state.settings.imageChannel = !!body.imageChannel;
    if (body.channelName !== undefined) {
      const n = String(body.channelName).trim().slice(0, 40);
      state.settings.channelName = n || 'example公司';
      if (state.providers[0]) state.providers[0].name = state.settings.channelName;
    }
    if (body.imageModel) state.settings.imageModel = body.imageModel;
    saveState(state);
    return json(res, { ok: true });
  }

  if (p === '/api/provider/quick' && m === 'POST') {
    const body = await bodyOf(req);
    const key = String(body.apiKey || '').trim();
    if (!key) return json(res, { error: 'apiKey 为空' }, 400);
    const base = String(body.baseUrl || state.settings?.endpoint || 'https://example1.com/v1').replace(/\/+$/, '');
    let models = (body.models || []).filter(Boolean);
    let fetched = [];
    try {
      const r = await fetch(urlBase(base, 'v1') + '/models', {
        headers: { authorization: 'Bearer ' + key },
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) {
        const j = await r.json();
        fetched = (j.data || j.models || []).map((x) => (typeof x === 'string' ? x : x.id)).filter(Boolean);
      }
    } catch { /* offline is fine, models may be typed */ }
    if (!models.length) models = fetched.slice(0, 40);
    if (!models.length) models = [state.settings?.tierModel || 'deepseek-v4.1-flash'];

    const id = 'example';
    const existing = findProvider(state, id);
    upsertProvider(state, {
      id,
      name: existing?.name || state.settings?.channelName || 'example公司',
      protocol: 'openai-chat',
      protocols: ['openai-chat', 'anthropic', 'openai-responses'],
      baseUrl: base,
      apiKey: key,
      models: models.map((mid) => ({ id: mid })),
    });
    state.settings = state.settings || {};
    state.settings.endpoint = base;
    state.settings.endpointCandidates = state.settings.endpointCandidates?.length
      ? state.settings.endpointCandidates
      : ENDPOINT_CANDIDATES.map((e) => ({ id: e.id, label: e.label, url: e.url }));
    saveState(state);
    return json(res, { ok: true, fetched: fetched.slice(0, 40), models });
  }

  if (p === '/api/provider/probe' && m === 'POST') {
    const prim = state.providers[0];
    if (!prim) return json(res, { ok: false, error: '还没有供应商' });
    try {
      const r = await fetch(urlBase(prim.baseUrl, 'v1') + '/models', {
        headers: prim.apiKey ? { authorization: 'Bearer ' + prim.apiKey } : {},
        signal: AbortSignal.timeout(12000),
      });
      const text = await r.text();
      let models = [];
      try { const j = JSON.parse(text); models = (j.data || j.models || []).map((x) => (typeof x === 'string' ? x : x.id)); } catch { /* noop */ }
      return json(res, { ok: r.ok, status: r.status, models, error: r.ok ? null : text.slice(0, 200) });
    } catch (e) {
      return json(res, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/providers' && m === 'POST') {
    const body = await bodyOf(req);
    const incoming = body.provider || {};
    const prev = incoming.id ? state.providers.find((x) => x.id === incoming.id) : null;
    if (prev && incoming.apiKey === undefined) incoming.apiKey = prev.apiKey;
    upsertProvider(state, incoming);
    saveState(state);
    return json(res, { ok: true });
  }

  if (p.startsWith('/api/providers/') && m === 'DELETE') {
    const id = decodeURIComponent(p.split('/').pop());
    state.providers = state.providers.filter((x) => x.id !== id);
    for (const [t, a] of Object.entries(state.assignments)) if (a.providerId === id) delete state.assignments[t];
    saveState(state);
    return json(res, { ok: true });
  }

  if (p === '/api/assign' && m === 'POST') {
    const body = await bodyOf(req);
    if (!body.toolId || !adapterById(body.toolId)) return json(res, { error: 'unknown tool' }, 400);
    const prim = state.providers[0];
    if (!body.providerId || !prim) delete state.assignments[body.toolId];
    else {
      state.assignments[body.toolId] = {
        providerId: body.providerId,
        modelId: body.modelId || resolveModel(state) || prim.models[0]?.id || '',
      };
    }
    saveState(state);
    return json(res, { ok: true });
  }

  if (p === '/api/assign/bulk' && m === 'POST') {
    const body = await bodyOf(req);
    const prim = state.providers[0];
    if (body.clear) {
      state.assignments = {};
      saveState(state);
      return json(res, { ok: true, count: 0 });
    }
    if (!prim) return json(res, { error: '先保存密钥' }, 400);
    const model = resolveModel(state) || prim.models[0]?.id || '';
    let n = 0;
    for (const id of body.toolIds || []) {
      if (!adapterById(id)) continue;
      state.assignments[id] = { providerId: prim.id, modelId: model };
      n++;
    }
    saveState(state);
    return json(res, { ok: true, count: n });
  }

  if (p === '/api/draft/generate' && m === 'POST') {
    const draft = buildDraft(state);
    const check = validateDraft(draft, state);
    state.runs = state.runs || {};
    state.runs.lastDraft = { ok: check.ok, at: new Date().toISOString(), summary: draft.summary, errors: check.errors };
    saveState(state);
    return json(res, { ok: check.ok, draft, errors: check.errors, warnings: check.warnings });
  }

  if (p === '/api/draft/validate' && m === 'POST') {
    const body = await bodyOf(req);
    const check = validateDraft(body.draft, state);
    state.runs = state.runs || {};
    state.runs.lastDraft = { ok: check.ok, at: new Date().toISOString(), errors: check.errors };
    saveState(state);
    return json(res, check);
  }

  if (p === '/api/draft/apply' && m === 'POST') {
    const body = await bodyOf(req);
    const r = applyDraft(state, body.draft, { dryRun: !!body.dryRun });
    return json(res, r, r.ok ? 200 : 400);
  }

  if (p === '/api/draft' && m === 'GET') {
    return json(res, buildDraft(state));
  }

  if (p.startsWith('/api/drafts/') && m === 'GET') {
    return json(res, readDraftFile(decodeURIComponent(p.split('/').pop())));
  }

  if (p === '/api/diagnose' && m === 'POST') {
    const body = await bodyOf(req);
    const r = await diagnose(state, {
      tools: body.tools || null,
      endpointsOnly: !!body.endpointsOnly,
    });
    if (body.endpointsOnly) {
      r.models = [];
      r.tools = [];
    }
    state.runs = state.runs || {};
    state.runs.lastDiagnose = r;
    if (r.fastest && !state.settings.endpointManual) {
      state.settings.endpoint = r.fastest.url;
      state.settings.endpointManual = false;
      const prim = state.providers[0];
      if (prim) prim.baseUrl = r.fastest.url;
    }
    saveState(state);
    return json(res, r);
  }

  if (p === '/api/test/image' && m === 'POST') {
    const prim = state.providers[0];
    if (!prim) return json(res, { ok: false, error: '还没有供应商' });
    const model = state.settings?.imageModel || 'gpt-image-2';
    const r = await probeImage({ baseUrl: prim.baseUrl, apiKey: prim.apiKey, model });
    return json(res, r);
  }

  if (p === '/api/rollback' && m === 'POST') {
    const body = await bodyOf(req);
    const restored = rollbackStamp(body.stamp);
    return json(res, { ok: true, restored });
  }

  if (p === '/api/profile' && m === 'POST') {
    const body = await bodyOf(req);
    const n = setProfile(body.profile);
    return json(res, { ok: true, profile: n });
  }

  if (p === '/api/import' && m === 'POST') {
    const body = await bodyOf(req);
    const check = validateDraft(body.draft, state);
    if (!check.ok) return json(res, check, 400);
    const r = applyDraft(state, body.draft, { dryRun: true });
    return json(res, r);
  }

  if (p === '/api/plan' && m === 'GET') {
    const tools = url.searchParams.get('tools');
    return json(res, buildPlan(state, { tools: tools ? tools.split(',') : null }));
  }

  if (p === '/api/apply' && m === 'POST') {
    const body = await bodyOf(req);
    const plan = buildPlan(state, { tools: body.tools || null });
    const out = applyPlan(state, { plan, dryRun: !!body.dryRun });
    state.runs = state.runs || {};
    state.runs.lastApply = { at: new Date().toISOString(), results: out.results };
    saveState(state);
    return json(res, out);
  }

  if (p === '/api/site/login' && m === 'POST') {
    const body = await bodyOf(req);
    const site = String(body.site || state.settings?.endpoint || '').replace(/\/+$/, '');
    if (!site) return json(res, { error: '先选站点' }, 400);
    try {
      const out = await login({ site, email: body.email, password: body.password });
      state.sites = state.sites || {};
      state.sites[site] = {
        token: out.token,
        refresh: out.refresh,
        expiresIn: out.expiresIn,
        email: body.email,
        user: out.user ? { id: out.user.id, username: out.user.username, role: out.user.role } : null,
        at: new Date().toISOString(),
      };
      state.settings = state.settings || {};
      state.settings.endpoint = site;
      saveState(state);
      let keys = [];
      try { keys = await fetchKeys(site, out.token); } catch (e) { /* keep login, report below */ }
      if (keys.length) {
        state.sites[site].keys = keys.map((k) => ({ id: k.id, name: k.name, group: k.group, rate: k.rate, image: k.image, key: k.key }));
        saveState(state);
      }
      const me = await fetchMe(site, out.token);
      return json(res, { ok: true, user: state.sites[site].user, keys: maskedKeys(state), me });
    } catch (e) {
      return json(res, { error: String(e.message || e) }, 400);
    }
  }

  if (p === '/api/site/browser' && m === 'POST') {
    const body = await bodyOf(req);
    const site = String(body.site || state.settings?.endpoint || '').replace(/\/+$/, '');
    if (!site) return json(res, { error: '先选站点' }, 400);
    try {
      const r = await readSessionFromBrowser(site);
      if (!r.ok) return json(res, { ok: false, reason: r.reason, scanned: r.scanned || 0, profiles: profileDirs().length });
      state.sites = state.sites || {};
      state.sites[site] = {
        token: r.token,
        email: (r.user && r.user.email) || '',
        user: r.user ? { id: r.user.id, email: r.user.email, role: r.user.role } : null,
        balance: r.user ? r.user.balance : null,
        source: 'browser:' + r.browser + '/' + r.profile,
        keys: (r.keys || []).map((k) => ({ id: k.id, name: k.name, group: k.group, rate: k.rate, image: k.image, key: k.key })),
        at: new Date().toISOString(),
      };
      state.settings = state.settings || {};
      state.settings.endpoint = site;
      saveState(state);
      return json(res, { ok: true, from: r.browser + ' / ' + r.profile, keys: maskedKeys(state), email: (r.user && r.user.email) || '', balance: r.user ? r.user.balance : null });
    } catch (e) {
      return json(res, { error: String(e.message || e) }, 400);
    }
  }

  if (p === '/api/site/logout' && m === 'POST') {
    const body = await bodyOf(req);
    const site = String(body.site || state.settings?.endpoint || '').replace(/\/+$/, '');
    if (state.sites && state.sites[site]) { delete state.sites[site]; saveState(state); }
    return json(res, { ok: true });
  }

  if (p === '/api/key/select' && m === 'POST') {
    const body = await bodyOf(req);
    const site = String(body.site || state.settings?.endpoint || '').replace(/\/+$/, '');
    const cached = state.sites?.[site]?.keys || [];
    const chosen = cached.find((k) => String(k.id) === String(body.keyId));
    if (!chosen) return json(res, { error: 'key 不存在，重新登录一次' }, 400);
    let models = [];
    try {
      models = await fetchModelsForKey(site, chosen.key);
    } catch (e) {
      return json(res, { error: '这个 key 取不到模型：' + String(e.message || e) }, 400);
    }
    const id = 'example';
    upsertProvider(state, {
      id,
      name: 'example公司',
      protocol: 'openai-chat',
      protocols: ['openai-chat', 'anthropic', 'openai-responses'],
      baseUrl: site,
      apiKey: chosen.key,
      models: (models.length ? models : [{ id: 'deepseek-v4.1-flash' }]).map((m) => ({ id: m.id })),
    });
    state.settings = state.settings || {};
    state.settings.endpoint = site;
    state.settings.activeKeyId = String(chosen.id);
    saveState(state);
    return json(res, { ok: true, models: (models || []).map((m) => m.id) });
  }

  if (p === '/api/model/select' && m === 'POST') {
    const body = await bodyOf(req);
    const prim = state.providers[0];
    if (!prim) return json(res, { error: '还没有 key' }, 400);
    const id = String(body.modelId || '');
    if (!id) return json(res, { error: 'modelId 为空' }, 400);
    const ctxWin = Number(body.contextWindow) || guessContext(id);
    prim.models = [{ id, contextWindow: ctxWin, tools: true }];
    state.settings = state.settings || {};
    state.settings.tierModel = id;
    state.settings.selectedModel = id;
    for (const toolId of Object.keys(state.assignments || {})) {
      state.assignments[toolId] = { providerId: prim.id, modelId: id };
    }
    saveState(state);
    return json(res, { ok: true, model: id, contextWindow: ctxWin, contextCap: contextCap({ id, contextWindow: ctxWin }, state.settings.contextFactor) });
  }

  if (p === '/api/agent/select' && m === 'POST') {
    const body = await bodyOf(req);
    if (!adapterById(body.toolId)) return json(res, { error: 'unknown tool' }, 400);
    const prim = state.providers[0];
    if (!prim) return json(res, { error: '还没有 key' }, 400);
    if (body.on === false) delete state.assignments[body.toolId];
    else {
      state.assignments[body.toolId] = {
        providerId: prim.id,
        modelId: state.settings?.selectedModel || prim.models[0]?.id || '',
      };
    }
    saveState(state);
    return json(res, { ok: true });
  }

  if (p === '/api/agent/path' && m === 'POST') {
    const body = await bodyOf(req);
    if (!adapterById(body.toolId)) return json(res, { error: 'unknown tool' }, 400);
    state.overrides = state.overrides || {};
    if (body.path) state.overrides[body.toolId] = String(body.path);
    else delete state.overrides[body.toolId];
    saveState(state);
    return json(res, { ok: true, path: state.overrides[body.toolId] || null });
  }

  if (p === '/api/agent/snippet' && m === 'GET') {
    const toolId = url.searchParams.get('tool');
    const adapter = adapterById(toolId);
    if (!adapter) return json(res, { error: 'unknown tool' }, 404);
    const plan = buildPlan(state, { tools: [toolId] });
    const item = plan.items[0];
    if (!item) return json(res, { error: '先选中这个客户端' }, 400);
    const chan = state.settings?.channelName || 'example公司';
    const compat = item.resolved?.protocol === 'anthropic' ? 'Anthropic'
      : item.resolved?.protocol === 'openai-responses' ? 'Responses' : 'OpenAI';
    const files = item.files || [];
    const ctxWin = contextCap(
      { id: item.resolved?.modelId || '', contextWindow: state.providers[0]?.models?.[0]?.contextWindow },
      state.settings?.contextFactor
    );
    const fields = [];
    const push = (label, value) => { if (value !== undefined && value !== null && String(value) !== '') fields.push({ label, value: String(value) }); };
    push('名称', chan);
    push('兼容协议', compat);
    if (item.resolved) push('Base URL', item.resolved.baseUrl);
    if (item.resolved) push('API Key', (state.providers[0] || {}).apiKey || '');
    push('模型', item.resolved?.modelId || '');
    if (ctxWin) push('上下文', ctxWin);
    if (files[0]) push('配置文件', files[0].path);

    const steps = (item.guide || []).filter((g) => !/^名称[：:]/.test(g) && !/^Base URL[：:]/.test(g) && !/^API Key[：:]/.test(g) && !/^模型[：:]/.test(g));
    const text = ['# ' + adapter.name + ' · ' + chan]
      .concat(fields.map((f) => f.label + '：' + f.value))
      .concat(steps.length ? [''] : [])
      .concat(steps)
      .join('\n');
    return json(res, {
      ok: true,
      title: adapter.name,
      name: chan,
      fields,
      steps,
      text,
      path: files[0]?.path || '',
      error: item.error || null,
    });
  }

  if (p === '/api/auto/scan' && m === 'GET') {
    return json(res, await autoScan());
  }

  if (p === '/api/auto/run' && m === 'POST') {
    const body = await bodyOf(req);
    const r = await autoRun(state, { tools: body.tools || null });
    return json(res, r, r.ok ? 200 : 400);
  }

  if (p === '/api/net/check' && m === 'GET') {
    return json(res, await networkCheck());
  }

  if (p === '/api/net/quick' && m === 'GET') {
    return json(res, await quickNet());
  }

  if (p === '/api/plugins' && m === 'GET') {
    return json(res, { plugins: PLUGINS, profile: state.settings?.dshProfile || 'web' });
  }

  if (p === '/api/plugin/install' && m === 'POST') {
    const body = await bodyOf(req);
    const pl = PLUGINS.find((x) => x.id === body.id);
    if (!pl) return json(res, { error: 'unknown plugin' }, 404);
    if (pl.kind !== 'package') {
      return json(res, { ok: false, manual: true, hint: '这是 DSH 内置的实验性开关，只能在 DSH 设置里打开。' });
    }
    const profile = state.settings?.dshProfile || 'web';
    const command = `dsh plugin --profile ${profile} add ${pl.pkg}`;
    if (!body.run) return json(res, { ok: false, pending: true, command });
    try {
      const out = await new Promise((resolve) => {
        const child = childProcess.spawn('dsh', ['plugin', '--profile', profile, 'add', pl.pkg], { shell: true, windowsHide: true });
        let buf = '';
        const kill = setTimeout(() => { try { child.kill(); } catch { /* ignore */ } resolve({ code: -1, out: buf + '\n[timeout 240s]' }); }, 240000);
        child.stdout.on('data', (d) => { buf += d; });
        child.stderr.on('data', (d) => { buf += d; });
        child.on('close', (code) => { clearTimeout(kill); resolve({ code, out: buf }); });
        child.on('error', (e) => { clearTimeout(kill); resolve({ code: -1, out: String(e.message || e) }); });
      });
      return json(res, { ok: out.code === 0, command, code: out.code, output: out.out.slice(-4000) });
    } catch (e) {
      return json(res, { ok: false, command, error: String(e.message || e) });
    }
  }

  if (p === '/api/intro' && m === 'POST') {
    const body = await bodyOf(req);
    state.settings = state.settings || {};
    state.settings.seenIntro = body.seen !== false;
    saveState(state);
    return json(res, { ok: true, seenIntro: state.settings.seenIntro });
  }

  if (p === '/api/backups' && m === 'GET') return json(res, listBackups(60));

  return json(res, { error: 'unknown endpoint: ' + p }, 404);
}

function siteInfo(state) {
  const site = String(state.settings?.endpoint || '');
  const s = state.sites?.[site];
  return {
    url: site,
    loggedIn: !!s?.token,
    email: s?.email || '',
    user: s?.user || null,
    at: s?.at || null,
    hasKeys: !!(s?.keys && s.keys.length),
  };
}

function maskedKeys(state) {
  const site = String(state.settings?.endpoint || '');
  const keys = state.sites?.[site]?.keys || [];
  return keys.map((k) => ({
    id: k.id, name: k.name, group: k.group, rate: k.rate, image: k.image,
    masked: maskKey(k.key),
    active: String(state.settings?.activeKeyId || '') === String(k.id),
  }));
}

function agentCatalog(state) {
  return toolCatalog().map((t) => {
    const override = state.overrides?.[t.id] || '';
    const detected = (t.paths || []).find((p) => p.exists);
    const loc = locate(t.id, { fast: true });
    return {
      ...t,
      override,
      detectedPath: loc.configPath || (detected ? detected.path : ''),
      selected: !!state.assignments?.[t.id],
      installed: !!loc.installed,
      via: loc.via || '',
      configPath: loc.configPath || '',
      programPath: loc.programPath || '',
      cliPath: loc.cliPath || '',
      extPath: loc.extPath || '',
      dockerOnly: !!loc.dockerOnly,
      remoteOnly: !!loc.remoteOnly,
      evidence: loc.evidence || '',
      hint: loc.hint || '',
      deprecated: loc.deprecated || '',
    };
  });
}

function publicProvider(pr) {
  return { ...pr, apiKey: undefined, apiKeyMasked: mask(pr.apiKey), hasKey: !!pr.apiKey };
}

function bodyOf(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 4_000_000) req.destroy(); });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('bad json body')); }
    });
    req.on('error', reject);
  });
}

function send(res, code, type, text) {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(text);
}

function json(res, obj, code = 200) {
  send(res, code, 'application/json; charset=utf-8', JSON.stringify(obj, null, 2));
}

function logLine(msg) {
  try {
    const dir = path.join(homeDir(), 'logs');
    ensureDir(dir);
    fs.appendFileSync(path.join(dir, 'server.log'), `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
  } catch (e) {
    try { fs.appendFileSync(path.join(os.tmpdir(), 'aac-log-error.txt'), String(e && e.stack || e) + '\n'); } catch { /* ignore */ }
  }
}

export function startServer({ port = 0, open = true } = {}) {
  const server = createServer();
  server.listen(port, HOST, () => {
    const addr = server.address();
    const u = `http://${HOST}:${addr.port}`;
    // log first: a GUI-subsystem build has no valid stdout and console.log can throw
    logLine('listening ' + u + ' state=' + sp());
    try { console.log(`\n  agent-api-config running at ${u}\n  state: ${sp()}\n`); } catch { /* no console */ }
    if (open) openBrowser(u);
  });
  return server;
}

export function openBrowser(u) {
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '""', u], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'darwin') spawn('open', [u], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [u], { detached: true, stdio: 'ignore' }).unref();
  } catch { /* headless */ }
}

export { ADAPTERS };
