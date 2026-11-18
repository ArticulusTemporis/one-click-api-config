// Builds preview.html: one static file, no server, 10 switchable presets.
// Run: node scripts/build-preview.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HTML, CSS, APP_JS } from '../src/web/assets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MOCK = {
  categories: [
    { id: 'cli', label: '终端 / 编码 Agent' },
    { id: 'ide', label: '编辑器插件' },
    { id: 'desktop', label: '桌面客户端' },
    { id: 'web', label: '网页 / 自部署服务' },
    { id: 'dsh', label: 'DSH 家族' },
  ],
  keys: [
    { id: '1', name: 'deepseek', group: 'Deepseek高端组', rate: 0.37, masked: 'sk-a14f••••dda8' },
    { id: '2', name: '手机端低价组', group: 'DeepSeek特价组', rate: 0.088, masked: 'sk-eab2••••a8e0' },
    { id: '3', name: 'Picture', group: 'gpt 图片号池', rate: 0.168, image: true, masked: 'sk-9c31••••6f27' },
  ],
  models: [
    'deepseek-v4.1-flash', 'deepseek-v4.1-flash-261017', 'deepseek-v4-flash',
    'deepseek-v4-pro', 'deepseek-v4-1-flash', 'gpt-6.1-sol', 'gpt-6-astra',
    'gpt-image-2', 'claude-opus-5-5', 'gemini-3.8-flash',
  ],
  agents: [
    { id: 'claude-code', name: 'Claude Code', category: 'cli', writable: 'auto', note: '只吃 Anthropic Messages',
      paths: [{ path: 'C:\\Users\\you\\.claude\\settings.json', exists: true }], detected: true },
    { id: 'codex', name: 'Codex CLI', category: 'cli', writable: 'auto', note: '只吃 OpenAI Responses',
      paths: [{ path: 'C:\\Users\\you\\.codex\\config.toml', exists: true }], detected: true },
    { id: 'opencode', name: 'OpenCode', category: 'cli', writable: 'auto', note: '多协议',
      paths: [{ path: 'C:\\Users\\you\\.config\\opencode\\opencode.jsonc', exists: true }], detected: true },
    { id: 'kimi-cli', name: 'Kimi CLI', category: 'cli', writable: 'auto', note: '六协议',
      paths: [{ path: 'C:\\Users\\you\\.kimi\\config.toml', exists: false }], detected: false },
    { id: 'crush', name: 'Crush', category: 'cli', writable: 'auto', note: 'crushrc',
      paths: [{ path: 'C:\\Users\\you\\.config\\crush\\crushrc', exists: false }], detected: false },
    { id: 'hermes-agent', name: 'Hermes Agent', category: 'cli', writable: 'export', note: 'config.yaml', paths: [], detected: false },
    { id: 'minimax-code', name: 'MiniMax Code', category: 'cli', writable: 'export', note: 'YAML', paths: [], detected: false },
    { id: 'continue', name: 'Continue', category: 'ide', writable: 'auto', note: 'config.yaml',
      paths: [{ path: 'C:\\Users\\you\\.continue\\config.yaml', exists: false }], detected: false },
    { id: 'kilo', name: 'Kilo Code', category: 'ide', writable: 'auto', note: 'kilo.jsonc',
      paths: [{ path: 'C:\\Users\\you\\.config\\kilo\\kilo.jsonc', exists: true }], detected: true },
    { id: 'cursor', name: 'Cursor', category: 'ide', writable: 'guided', note: '只有 GUI', paths: [], detected: false },
    { id: 'cline-vscode', name: 'Cline (VS Code)', category: 'ide', writable: 'guided', note: 'SecretStorage 加密', paths: [], detected: false },
    { id: 'cherry-studio', name: 'Cherry Studio', category: 'desktop', writable: 'guided', note: 'SQLite + IndexedDB', paths: [], detected: false },
    { id: 'chatbox', name: 'Chatbox', category: 'desktop', writable: 'export', note: '官方导入格式', paths: [], detected: false },
    { id: 'workbuddy', name: 'WorkBuddy', category: 'desktop', writable: 'export', note: '设置 › 模型 › 自定义模型', paths: [], detected: false },
    { id: 'open-webui', name: 'Open WebUI', category: 'web', writable: 'export', note: 'env', paths: [], detected: false },
    { id: 'lobe-chat', name: 'LobeChat', category: 'web', writable: 'export', note: 'env', paths: [], detected: false },
    { id: 'deepseek-harness', name: 'DeepSeek Harness', category: 'dsh', writable: 'export', note: '设置 › 模型', paths: [], detected: false },
    { id: 'dsh-go', name: 'dsh-Go（手机 App）', category: 'dsh', writable: 'export', note: '设置 › 模型 › 添加渠道', paths: [], detected: false },
  ],
};

const PRESETS = [
  { id: 'p1', label: '未登录', logged: false, keyIdx: -1, model: '', picked: [], verify: 'none', chan: 'example公司' },
  { id: 'p2', label: '已登录·未选 key', logged: true, keyIdx: -1, model: '', picked: [], verify: 'none', chan: 'example公司' },
  { id: 'p3', label: '已选 key·未选模型', logged: true, keyIdx: 0, model: '', picked: [], verify: 'none', chan: 'example公司' },
  { id: 'p4', label: '已选模型·未选 agent', logged: true, keyIdx: 0, model: 'deepseek-v4.1-flash', picked: [], verify: 'none', chan: 'example公司' },
  { id: 'p5', label: '已选 agent·未验证', logged: true, keyIdx: 0, model: 'deepseek-v4.1-flash', picked: ['claude-code', 'codex', 'opencode'], verify: 'none', chan: 'example公司' },
  { id: 'p6', label: '验证全部通过', logged: true, keyIdx: 0, model: 'deepseek-v4.1-flash', picked: ['claude-code', 'codex', 'opencode', 'dsh-go'], verify: 'ok', chan: 'example公司' },
  { id: 'p7', label: '验证部分失败', logged: true, keyIdx: 0, model: 'deepseek-v4.1-flash', picked: ['claude-code', 'codex', 'opencode'], verify: 'mixed', chan: 'example公司' },
  { id: 'p8', label: '自定义名称', logged: true, keyIdx: 1, model: 'deepseek-v4.1-flash', picked: ['claude-code'], verify: 'none', chan: 'example公司 特价线' },
  { id: 'p9', label: '全部展开', logged: true, keyIdx: 0, model: 'deepseek-v4.1-flash', picked: ['claude-code'], verify: 'none', chan: 'example公司', showAll: true },
  { id: 'p10', label: '深色', logged: true, keyIdx: 0, model: 'deepseek-v4.1-flash', picked: ['claude-code', 'codex'], verify: 'ok', chan: 'example公司', dark: true },
  { id: 'p11', label: '复制弹层', logged: true, keyIdx: 0, model: 'deepseek-v4.1-flash', picked: ['claude-code', 'dsh-go'], verify: 'none', chan: 'example公司', snippet: 'dsh-go' },
  { id: 'p12', label: '首次弹窗', logged: false, keyIdx: -1, model: '', picked: [], verify: 'none', chan: 'example公司', intro: true },
  { id: 'p13', label: '自动完成', logged: true, keyIdx: 0, model: 'deepseek-v4.1-flash-261017', picked: ['claude-code', 'codex'], verify: 'ok', chan: 'example公司', showAuto: 'done' },
  { id: 'p14', label: '网络不通', logged: false, keyIdx: -1, model: '', picked: [], verify: 'none', chan: 'example公司', showAuto: 'network' },
];

const SHIM = `
/* ---------- static preview: mock backend ---------- */
var MP = ${JSON.stringify(MOCK)};
var PS = ${JSON.stringify(PRESETS)};
var cur = null, curIdx = 0;
function clone(o){ return JSON.parse(JSON.stringify(o)); }

function buildBoot(p){
  var chan = p.chan || 'example公司';
  var keys = MP.keys.map(function(k, i){ return Object.assign({}, k, { active: i === p.keyIdx }); });
  var agents = MP.agents.map(function(a){
    return {
      id: a.id, name: a.name, writable: a.writable, note: a.note, category: a.category,
      paths: a.paths, detectedPath: a.detected ? a.paths[0].path : '',
      override: '', selected: p.picked.indexOf(a.id) >= 0,
    };
  });
  var prim = p.keyIdx < 0 ? null : {
    id: 'example', name: chan, hasKey: true, apiKeyMasked: MP.keys[p.keyIdx].masked,
    baseUrl: 'https://example1.com',
    protocols: ['openai-chat', 'anthropic', 'openai-responses'],
    models: MP.models.map(function(m){ return { id: m }; }),
  };
  var okTools = p.verify === 'none' ? [] : p.picked.map(function(id, i){
    var a = MP.agents.filter(function(x){ return x.id === id; })[0];
    var fail = p.verify === 'mixed' && i === 1;
    return { toolId: id, toolName: a.name, ok: !fail, ms: 180 + i * 120,
      model: p.model, baseUrl: 'https://example1.com/v1',
      error: fail ? 'HTTP 400 invalid model' : '' };
  });
  var steps = [
    { id: 'model', n: 1, title: '选择模型', hint: '', done: !!(p.logged && p.model), detail: p.model || (p.logged ? '还没选模型' : '未登录') },
    { id: 'agent', n: 2, title: '选择 Agent', hint: '', done: p.picked.length > 0, detail: p.picked.length ? p.picked.length + ' 个' : '未选择' },
    { id: 'verify', n: 3, title: '连通性验证', hint: '', done: okTools.some(function(t){ return t.ok; }), detail: okTools.length ? (okTools.filter(function(t){ return t.ok; }).length + ' 个通过') : '未验证' },
    { id: 'more', n: 4, title: '更多', hint: '', done: false, detail: '待补充', optional: true },
  ];
  return {
    profile: 'preview' + (curIdx ? '-' + (curIdx + 1) : ''),
    categories: MP.categories,
    site: { url: 'https://example1.com', loggedIn: p.logged, email: p.logged ? 'you@example.com' : '', hasKeys: keys.length > 0 },
    keys: p.logged ? keys : [],
    providers: prim ? [prim] : [],
    settings: { selectedModel: p.model, endpoint: 'https://example2.com', channelName: chan },
    introSeen: !p.intro,
    agents: agents,
    assignments: p.picked.reduce(function(acc, id){ acc[id] = { providerId: 'example', modelId: p.model }; return acc; }, {}),
    steps: steps,
    lastDiagnose: okTools.length ? { at: new Date().toISOString(), tools: okTools, endpoints: [] } : null,
    tools: [], tiers: [],
  };
}

function apply(p){
  cur = clone(p);
  boot = buildBoot(cur);
  showAllAgents = !!cur.showAll;
  document.documentElement.classList.toggle('force-dark', !!cur.dark);
  try { render(); } catch (e) {
    var box = document.getElementById('s-model');
    if (box) box.textContent = 'PREVIEW ERROR: ' + (e && e.message) + ' | ' + (e && e.stack ? String(e.stack).split(String.fromCharCode(10))[1] : '');
    throw e;
  }
  markBar();
  window.scrollTo({ top: 0 });
  var sh = document.getElementById('sheet');
  if (sh) sh.classList.add('hidden');
  if (cur.snippet){ setTimeout(function(){ openSnippet(cur.snippet); }, 60); }
  if (cur.showAuto === 'done'){
    setTimeout(function(){ renderDone({
      endpoint: 'https://example2.com', endpointMs: 41,
      account: { email: 'you@example.com', balance: 8.46 },
      key: { name: '手机端低价组', masked: 'sk-eaa••••a8e0', rate: 0.088 },
      model: 'deepseek-v4.1-flash-261017', contextCap: 950000,
      tools: [{ id: 'claude-code', name: 'Claude Code' }, { id: 'codex', name: 'Codex CLI' }],
      results: [{ written: true, path: 'C:\\Users\\you\\.claude\\settings.json' }, { written: true, path: 'C:\\Users\\you\\.codex\\config.toml' }],
      otherEndpoints: [{ label: 'example2.com', ok: true, ms: 41 }, { label: 'example1.com', ok: true, ms: 186 }, { label: 'example3.com', ok: true, ms: 198 }, { label: 'example4.com', ok: true, ms: 458 }]
    }); }, 80);
  }
  if (cur.showAuto === 'network'){
    setTimeout(function(){ renderNetwork([
      { label: 'example2.com', url: 'https://example2.com/v1', ok: false },
      { label: 'example1.com', url: 'https://example1.com/v1', ok: false },
      { label: 'example3.com', url: 'https://example3.com/v1', ok: false },
      { label: 'example4.com', url: 'https://example4.com/v1', ok: false }
    ], { advice: [
      '四个地址都解析不出 IP：本机 DNS 被接管了（VPN / Tailscale / Clash 的 MagicDNS 最常见）。先关掉这些再试。',
      '换成公共 DNS 能解析：把网卡 DNS 改成 223.5.5.5 或 8.8.8.8。',
      '用 https://example4.com/v1 再试一次：同一个 key 能用，这是别的都连不上时的备用地址。',
      '电脑连手机热点再试：能通就是本机网络，还是不通就是站点那头，把截图发给客服。'
    ] }, ''); }, 80);
  }
}

api = function(path, opt){
  var body = {};
  try { body = opt && opt.body ? JSON.parse(opt.body) : {}; } catch (e) { body = {}; }
  if (path === '/api/bootstrap') return Promise.resolve(boot);
  if (path === '/api/site/login'){ cur.logged = true; }
  else if (path === '/api/site/browser'){ cur.logged = true; }
  else if (path === '/api/site/logout'){ cur.logged = false; cur.keyIdx = -1; cur.model = ''; cur.picked = []; cur.verify = 'none'; }
  else if (path === '/api/key/select'){ cur.keyIdx = MP.keys.map(function(k){ return String(k.id); }).indexOf(String(body.keyId)); cur.model = ''; }
  else if (path === '/api/model/select'){ cur.model = body.modelId; }
  else if (path === '/api/settings'){ if (body.channelName !== undefined) cur.chan = body.channelName || 'example公司'; }
  else if (path === '/api/agent/select'){
    var i = cur.picked.indexOf(body.toolId);
    if (body.on === false || i >= 0) { if (i >= 0) cur.picked.splice(i, 1); }
    else cur.picked.push(body.toolId);
    cur.verify = 'none';
  }
  else if (path === '/api/agent/path'){ /* demo */ }
  else if (path === '/api/assign/bulk'){
    if (body.clear) cur.picked = [];
    else cur.picked = (body.toolIds || []).filter(function(id){ return MP.agents.some(function(a){ return a.id === id; }); });
    cur.verify = 'none';
  }
  else if (path === '/api/diagnose'){ cur.verify = 'ok'; }
  else if (path.indexOf('/api/agent/snippet') === 0){
    var tool = decodeURIComponent(path.split('tool=')[1] || '');
    var ag = MP.agents.filter(function(x){ return x.id === tool; })[0] || { name: 'Agent' };
    var chan2 = cur.chan || 'example公司';
    var model2 = cur.model || 'deepseek-v4.1-flash';
    var fields = [
      { label: '名称', value: chan2 },
      { label: '兼容协议', value: 'OpenAI' },
      { label: 'Base URL', value: 'https://example1.com/v1' },
      { label: 'API Key', value: 'sk-example-000000000000' },
      { label: '模型', value: model2 },
      { label: '上下文', value: '950000' }
    ];
    var steps = ag.category === 'dsh'
      ? ['手机 dsh-Go → 设置 → 模型 → 添加渠道', '模型那栏点「获取模型」自动拉，不用手动加', '请求头留空，填完点保存']
      : ['按上面的值填进软件设置', '保存后重启该客户端'];
    var NL = String.fromCharCode(10);
    var textLines = ['# ' + ag.name + ' | ' + chan2];
    for (var fi = 0; fi < fields.length; fi++) textLines.push(fields[fi].label + ': ' + fields[fi].value);
    return Promise.resolve({
      ok: true, title: ag.name, name: chan2, fields: fields, steps: steps,
      text: textLines.join(NL)
    });
  }
  else if (path === '/api/net/quick'){
    return Promise.resolve({ at: new Date().toISOString(), rows: [
      { id:'aliyun', label:'网络延迟', ok:true, ms:158, note:'' },
      { id:'example1', label:'中转站 1 · example1.com', ok:true, ms:174, note:'主站' },
      { id:'example2', label:'中转站 2 · example2.com', ok:true, ms:193, note:'备用入口' }
    ]});
  }
  else if (path === '/api/plugins'){
    return Promise.resolve({ profile:'web', plugins: [
      { id:'dsh-context', name:'上下文（dsh-context）', kind:'package', desc:'上下文仪表盘与 /context 命令。' },
      { id:'voice-input', name:'语音输入', kind:'builtin', desc:'本机 SenseVoice 转写。' },
      { id:'auto-approve', name:'自动授权审查', kind:'builtin', desc:'工具调用前由模型审查。' },
      { id:'session-search', name:'会话搜索', kind:'builtin', desc:'跨历史会话检索。' }
    ]});
  }
  else if (path === '/api/endpoint'){ /* demo */ }
  boot = buildBoot(cur); render();
  return Promise.resolve({ ok: true, models: MP.models });
};

function markBar(){
  Array.prototype.forEach.call(document.querySelectorAll('#pbar button'), function(b, i){
    b.style.background = i === curIdx ? 'var(--accent)' : 'transparent';
    b.style.color = i === curIdx ? 'var(--on-accent)' : 'var(--on-2)';
    b.style.borderColor = i === curIdx ? 'var(--accent)' : 'var(--line-2)';
  });
}

(function initBar(){
  var bar = document.createElement('div');
  bar.id = 'pbar';
  bar.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:80;display:flex;gap:7px;' +
    'flex-wrap:wrap;justify-content:center;padding:9px 13px;border-radius:999px;' +
    'background:color-mix(in srgb,var(--surface) 94%,transparent);border:1px solid var(--line);' +
    'backdrop-filter:blur(12px);box-shadow:var(--elev-2);max-width:94vw';
  bar.innerHTML = '<span style="font-size:11px;letter-spacing:.08em;color:var(--on-3);align-self:center;margin-right:2px">预设</span>' +
    PS.map(function(p, i){
      return '<button data-p="' + i + '" style="border:1px solid var(--line-2);border-radius:999px;padding:6px 11px;font-size:12px;cursor:pointer;background:transparent;color:var(--on-2);white-space:nowrap">' + p.label + '</button>';
    }).join('');
  document.body.appendChild(bar);
  bar.addEventListener('click', function(ev){
    var b = ev.target.closest('[data-p]');
    if (!b) return;
    curIdx = Number(b.getAttribute('data-p'));
    apply(PS[curIdx]);
  });
})();

curIdx = 0;
apply(PS[0]);
`;

const DARK_OVERRIDE = `
/* preview-only: force dark regardless of the OS setting */
html.force-dark{
  --bg:#0b0b0b; --surface:#0b0b0b; --surface-1:#141414; --surface-2:#1b1b1b; --surface-3:#232323;
  --on:#f3f3f3; --on-2:#a8a8a8; --on-3:#787878;
  --line:#252525; --line-2:#3a3a3a;
  --accent:#f3f3f3; --on-accent:#0b0b0b;
  --err:#ffb4a9;
  --elev-1:0 1px 3px rgba(0,0,0,.5),0 1px 2px rgba(0,0,0,.4);
  --elev-2:0 2px 6px 2px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.5);
  --elev-3:0 6px 10px 4px rgba(0,0,0,.35),0 2px 3px rgba(0,0,0,.5);
}
body{padding-bottom:84px}
`;

const page = HTML
  .replace('<style>__CSS__</style>', '<style>\n' + CSS + DARK_OVERRIDE + '</style>')
  .replace('<script src="/app.js?v=__VER__"></script>', '<script>window.onerror=function(m,src,l){document.title="ERR "+l+": "+m;};</script>\n<script>\n' + APP_JS + '\n</script>\n<script>\n' + SHIM + '\n</script>');

const out = path.join(root, 'preview.html');
if (!page.includes('function render()')) throw new Error('preview build lost APP_JS; check the script tag anchor');
if (!page.includes('--surface:')) throw new Error('preview build lost CSS');
fs.writeFileSync(out, page, 'utf8');
console.log('wrote', out, (page.length / 1024).toFixed(1) + 'KB', 'presets:', PRESETS.length);
