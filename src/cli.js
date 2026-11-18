import { ADAPTERS, adapterById, toolCatalog } from './adapters/index.js';
import {
  loadState, saveState, upsertProvider, findProvider, validateProvider,
  homeDir, statePath,
} from './core/ir.js';
import { buildPlan } from './core/plan.js';
import { applyPlan, renderPlanText } from './core/apply.js';
import { startServer } from './server.js';
import { ensurePublisherTrust } from './core/trust.js';
import { listBackups, exists } from './core/fsx.js';
import { mask, PROTOCOLS } from './core/util.js';

const HELP = `agent-api-config (aac)

  aac serve [--port N] [--no-open]     启动 Web UI（默认随机端口 + 自动开浏览器）
  aac provider add --id <id> --protocol <p> --base <url> [--key K] [--models a,b] [--name N]
  aac provider list
  aac provider rm <id>
  aac assign <toolId> <providerId>[/<modelId>] [--small <modelId>]
  aac unassign <toolId>
  aac tools
  aac plan [--tool id,id] [--json]
  aac apply [--tool id,id] [--dry-run] [--yes]
  aac test <providerId>
  aac gateway [--url U] [--protocol <p>] [--key K] [--on|--off]
  aac backups
  aac doctor

protocols: ${PROTOCOLS.join(' | ')}
state: ${statePath()}
`;

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args.flags[key] = true;
      else { args.flags[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

function splitTools(v) {
  if (!v || v === true) return null;
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const [cmd, sub] = args._;

  if (!cmd || cmd === 'help' || cmd === '--help' || args.flags.help) {
    process.stdout.write(HELP);
    return;
  }

  if (cmd === 'serve') {
    // single-file builds carry their publisher certificate: trust it once, silently
    if (!args.flags['no-trust']) {
      ensurePublisherTrust().then((r) => {
        if (r === 'installed') console.log('publisher certificate installed (verified publisher from now on)');
      });
    }
    const server = startServer({ port: Number(args.flags.port) || 0, open: !args.flags['no-open'] });
    process.on('SIGINT', () => server.close(() => process.exit(0)));
    return;
  }

  if (cmd === 'provider') {
    const state = loadState();
    if (sub === 'list' || !sub) {
      if (!state.providers.length) return console.log('(no providers)');
      for (const p of state.providers) {
        console.log(`${p.id}\t${p.protocol}\t${p.baseUrl}\t${p.hasKey === false ? '' : mask(p.apiKey)}\t${p.models.map((m) => m.id).join(',')}`);
      }
      return;
    }
    if (sub === 'add') {
      const f = args.flags;
      if (!f.id || !f.base) return console.error('need --id and --base');
      const models = String(f.models || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!models.length) return console.error('need --models a,b');
      const p = upsertProvider(state, {
        id: f.id,
        name: f.name || f.id,
        protocol: f.protocol || 'openai-chat',
        baseUrl: f.base,
        apiKey: f.key || '',
        apiKeyEnv: f.env || undefined,
        models: models.map((id) => ({ id })),
      });
      saveState(state);
      console.log(`saved provider ${p.id} (${p.protocol}) ${p.baseUrl}`);
      return;
    }
    if (sub === 'rm') {
      const id = args._[2];
      if (!id) return console.error('need <id>');
      state.providers = state.providers.filter((p) => p.id !== id);
      for (const [t, a] of Object.entries(state.assignments)) if (a.providerId === id) delete state.assignments[t];
      saveState(state);
      console.log('removed ' + id);
      return;
    }
    return console.error('unknown provider subcommand: ' + sub);
  }

  if (cmd === 'tools') {
    for (const t of toolCatalog()) {
      const where = t.paths.map((p) => (p.exists ? '✓ ' : '· ') + p.path).join('\n      ');
      console.log(`${t.id}\t[${t.group}/${t.writable}]\taccepts ${t.accepts.join(',')}${where ? '\n      ' + where : ''}`);
    }
    return;
  }

  if (cmd === 'assign') {
    const toolId = args._[1];
    const spec = args._[2];
    if (!toolId || !spec) return console.error('need <toolId> <providerId>[/<modelId>]');
    const adapter = adapterById(toolId);
    if (!adapter) return console.error('unknown tool: ' + toolId);
    const state = loadState();
    const [providerId, modelId] = spec.split('/');
    if (!findProvider(state, providerId)) return console.error('unknown provider: ' + providerId);
    state.assignments[toolId] = {
      providerId,
      modelId: modelId || '',
      smallModelId: args.flags.small || undefined,
    };
    saveState(state);
    console.log(`assigned ${toolId} -> ${providerId}${modelId ? '/' + modelId : ''}`);
    return;
  }

  if (cmd === 'unassign') {
    const toolId = args._[1];
    const state = loadState();
    delete state.assignments[toolId];
    saveState(state);
    console.log('unassigned ' + toolId);
    return;
  }

  if (cmd === 'gateway') {
    const state = loadState();
    const f = args.flags;
    if (f.on) state.gateway.enabled = true;
    if (f.off) state.gateway.enabled = false;
    if (f.url) state.gateway.baseUrl = f.url;
    if (f.protocols) state.gateway.protocols = String(f.protocols).split(',').map((s) => s.trim()).filter(Boolean);
    if (f.key) state.gateway.apiKey = f.key;
    saveState(state);
    console.log(JSON.stringify({ ...state.gateway, apiKey: mask(state.gateway.apiKey) }, null, 2));
    return;
  }

  if (cmd === 'plan') {
    const state = loadState();
    const plan = buildPlan(state, { tools: splitTools(args.flags.tool) });
    if (args.flags.json) return console.log(JSON.stringify(plan, null, 2));
    process.stdout.write(renderPlanText(plan));
    return;
  }

  if (cmd === 'apply') {
    const state = loadState();
    const plan = buildPlan(state, { tools: splitTools(args.flags.tool) });
    if (!args.flags.yes && !args.flags['dry-run']) {
      process.stdout.write(renderPlanText(plan));
      return console.error('\n(refusing to write without --yes; add --dry-run to preview only)');
    }
    const out = applyPlan(state, { plan, dryRun: !!args.flags['dry-run'] });
    for (const r of out.results) {
      if (r.written) console.log(`write  ${r.path}${r.backup ? '   [backup]' : ''}`);
      else if (r.dryRun) console.log(`dry    ${r.path}`);
      else console.log(`skip   ${r.path || r.toolId}  (${r.reason})`);
    }
    return;
  }

  if (cmd === 'test') {
    const id = args._[1];
    const state = loadState();
    const p = findProvider(state, id);
    if (!p) return console.error('unknown provider: ' + id);
    const base = p.baseUrl.replace(/\/+$/, '');
    const url = /\/v1$/.test(base) ? base + '/models' : base + '/v1/models';
    try {
      const r = await fetch(url, { headers: p.apiKey ? { authorization: 'Bearer ' + p.apiKey } : {}, signal: AbortSignal.timeout(12000) });
      const text = await r.text();
      console.log(`${r.status} ${url}`);
      console.log(text.slice(0, 800));
    } catch (e) {
      console.error('fetch failed: ' + e.message);
    }
    return;
  }

  if (cmd === 'backups') {
    for (const b of listBackups(50)) console.log(`${b.stamp}\t${b.file}\t${b.size}B`);
    return;
  }

  if (cmd === 'doctor') {
    const state = loadState();
    console.log('node        ' + process.version);
    console.log('platform    ' + process.platform);
    console.log('home        ' + homeDir());
    console.log('state       ' + statePath() + (exists(statePath()) ? '' : ' (not created yet)'));
    console.log('providers   ' + state.providers.length);
    console.log('assignments ' + Object.keys(state.assignments).length);
    console.log('gateway     ' + (state.gateway.enabled ? `on ${state.gateway.baseUrl} (${(state.gateway.protocols || []).join(', ')})` : 'off'));
    console.log('\ntools:');
    for (const t of toolCatalog()) {
      const mark = state.assignments[t.id] ? '*' : ' ';
      console.log(` ${mark} ${t.id.padEnd(16)} ${t.writable.padEnd(8)} ${t.paths.map((p) => (p.exists ? '✓' : '·')).join('')} ${t.paths[0] ? t.paths[0].path : ''}`);
    }
    return;
  }

  console.error('unknown command: ' + cmd + '\n');
  process.stdout.write(HELP);
  process.exitCode = 1;
}
