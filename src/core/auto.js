// Automatic setup: find the clients, pick the healthiest endpoint, take the
// session the user already has in their browser, then write everything.

import { ADAPTERS, adapterById } from '../adapters/index.js';
import { locateAll } from './locate.js';
import { pickEndpoint, diagnoseNetwork, ENDPOINTS } from './netcheck.js';
import { readSessionFromBrowser } from './browser.js';
import { fetchModelsForKey } from './site.js';
import { upsertProvider, saveState } from './ir.js';
import { buildPlan } from './plan.js';
import { applyPlan } from './apply.js';
import { guessContext, contextCap } from './context.js';

const MODEL_PREFERENCE = [
  'deepseek-v4.1-flash-261017',
  'deepseek-v4.1-flash',
  'deepseek-v4-flash',
  'deepseek-v4-pro',
];

function pickModel(models) {
  const ids = models.map((m) => (typeof m === 'string' ? m : m.id));
  for (const want of MODEL_PREFERENCE) if (ids.includes(want)) return want;
  return ids.find((id) => /deepseek.*flash/i.test(id)) || ids[0] || 'deepseek-v4.1-flash';
}

function pickKey(keys) {
  // cheapest usable group first: the support guide tells ordinary users to stay
  // on the discount group; image-only keys are useless for coding agents.
  const usable = keys.filter((k) => k.key);
  const scored = usable.map((k) => {
    const rate = Number(k.rate);
    return { k, rate: Number.isFinite(rate) ? rate : 1, image: !!k.image };
  });
  scored.sort((a, b) => (a.image === b.image ? a.rate - b.rate : a.image ? 1 : -1));
  return scored[0] ? scored[0].k : null;
}

/** Scan: what is installed, which endpoint is alive, is there a browser session. */
export async function scan() {
  const ids = ADAPTERS.map((a) => a.id);
  const located = locateAll(ids);
  const found = [];
  const missing = [];
  for (const a of ADAPTERS) {
    const loc = located[a.id] || { installed: false };
    const row = {
      id: a.id,
      name: a.name,
      category: a.category,
      writable: a.writable || 'auto',
      note: a.note || '',
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
    (row.installed ? found : missing).push(row);
  }
  found.sort((a, b) => (a.category === b.category ? 0 : a.category.localeCompare(b.category)));
  const net = await pickEndpoint();
  return {
    found,
    missing,
    endpoints: net.list,
    best: net.best,
    networkOk: !!net.best,
    counts: { installed: found.length, total: ADAPTERS.length },
  };
}

/** Full network diagnosis for the dedicated page. */
export async function networkCheck() {
  return diagnoseNetwork();
}

/**
 * Configure the chosen clients end to end.
 * Returns { ok, mode:'done'|'choose'|'network', ... }.
 */
export async function run(state, { tools = null } = {}) {
  const net = await pickEndpoint();
  if (!net.best) {
    const diagnosis = await diagnoseNetwork();
    return { ok: false, mode: 'network', diagnosis };
  }

  const site = net.best.baseUrl.replace(/\/v1$/, '');
  const located = locateAll(ADAPTERS.map((a) => a.id));
  const installed = ADAPTERS.filter((a) => located[a.id]?.installed);
  let targets = installed;
  if (Array.isArray(tools) && tools.length) {
    targets = tools.map((id) => adapterById(id)).filter(Boolean);
  }
  if (!targets.length) {
    return { ok: false, mode: 'choose', reason: '没有检测到已安装的客户端', found: installed.map((a) => ({ id: a.id, name: a.name })) };
  }
  const writable = targets.filter((a) => (a.writable || 'auto') !== 'guided');
  if (!writable.length) {
    return { ok: false, mode: 'choose', reason: '检测到的客户端只能手动填', found: targets.map((a) => ({ id: a.id, name: a.name })) };
  }

  // 1. session: reuse what the browser already has
  let session = null;
  const sitesToTry = [site, ...ENDPOINTS.map((e) => e.url.replace(/\/+$/, ''))].filter((v, i, arr) => arr.indexOf(v) === i);
  for (const s of sitesToTry) {
    const r = await readSessionFromBrowser(s).catch(() => null);
    if (r && r.ok) { session = { ...r, site: s }; break; }
  }
  if (!session) {
    return {
      ok: false,
      mode: 'login',
      reason: '浏览器里没有这个站的登录状态',
      endpoint: site,
      endpoints: net.list,
    };
  }

  const key = pickKey(session.keys || []);
  if (!key) {
    return { ok: false, mode: 'login', reason: '账号下没有可用的密钥', endpoint: site };
  }

  let models = [];
  try {
    models = await fetchModelsForKey(session.site, key.key);
  } catch (e) {
    return { ok: false, mode: 'network', diagnosis: await diagnoseNetwork(), detail: String(e.message || e) };
  }
  const modelId = pickModel(models);
  const ctxWin = guessContext(modelId);

  // 2. state: one provider, 95% context, chosen model
  const providerId = 'example';
  upsertProvider(state, {
    id: providerId,
    name: state.settings?.channelName || 'example公司',
    protocol: 'openai-chat',
    protocols: ['openai-chat', 'anthropic', 'openai-responses'],
    baseUrl: session.site,
    apiKey: key.key,
    models: models.slice(0, 80).map((m) => ({ id: typeof m === 'string' ? m : m.id })),
  });
  state.sites = state.sites || {};
  state.sites[session.site] = {
    token: session.token,
    email: (session.user && session.user.email) || '',
    user: session.user || null,
    balance: session.user ? session.user.balance : null,
    keys: (session.keys || []).map((k) => ({ id: k.id, name: k.name, group: k.group, rate: k.rate, image: k.image, key: k.key })),
    at: new Date().toISOString(),
    source: 'auto',
  };
  state.settings = state.settings || {};
  state.settings.endpoint = session.site;
  state.settings.contextFactor = 0.95;
  state.settings.selectedModel = modelId;
  state.settings.tierModel = modelId;
  state.settings.activeKeyId = String(key.id);
  state.settings.seenIntro = true;
  state.settings.autoConfigured = true;

  state.assignments = state.assignments || {};
  for (const a of writable) {
    state.assignments[a.id] = { providerId, modelId };
  }
  saveState(state);

  // 3. write files
  const plan = buildPlan(state, { tools: writable.map((a) => a.id) });
  const out = applyPlan(state, { plan });
  state.runs = state.runs || {};
  state.runs.lastApply = { at: new Date().toISOString(), results: out.results };
  saveState(state);

  const cap = contextCap({ id: modelId, contextWindow: ctxWin }, 0.95);
  return {
    ok: true,
    mode: 'done',
    endpoint: session.site,
    endpointNote: net.best.note || '',
    endpointMs: net.best.ms,
    otherEndpoints: net.list.map((e) => ({ label: e.label, ok: e.ok, ms: e.ms })),
    account: { email: (session.user && session.user.email) || '', balance: session.user ? session.user.balance : null },
    key: { name: key.name, group: key.group, rate: key.rate, masked: 'sk-' + String(key.key).slice(4, 8) + '••••' + String(key.key).slice(-4) },
    model: modelId,
    contextCap: cap,
    tools: writable.map((a) => ({ id: a.id, name: a.name })),
    results: out.results,
    plan: { changed: plan.summary.changed, files: plan.summary.files },
  };
}
