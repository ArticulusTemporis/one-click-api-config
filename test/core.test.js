import test from 'node:test';
import assert from 'node:assert/strict';
import { tomlSet, yamlSetFlat, yamlKeyBlock, stripJsonc, parseJsonc } from '../src/core/format.js';
import { urlBase, diffLines } from '../src/core/util.js';
import { emptyState, resolveEndpoint } from '../src/core/ir.js';

test('urlBase keeps one /v1', () => {
  assert.equal(urlBase('https://a.com/v1', 'v1'), 'https://a.com/v1');
  assert.equal(urlBase('https://a.com', 'v1'), 'https://a.com/v1');
  assert.equal(urlBase('https://a.com/v1/', 'root'), 'https://a.com');
  assert.equal(urlBase('https://a.com/api', 'root'), 'https://a.com/api');
});

test('tomlSet replaces root keys and same-name tables', () => {
  const src = 'model = "a"\n\n[model_providers.x]\nname = "old"\n\n[keep]\nk = 1\n';
  const out = tomlSet(src, {
    root: { model: 'b', model_provider: 'y' },
    tables: { 'model_providers.x': { name: 'new', base_url: 'https://z/v1' } },
  });
  assert.match(out, /^model = "b"/);
  assert.match(out, /model_provider = "y"/);
  assert.match(out, /\[model_providers\.x\]\nname = "new"/);
  assert.equal((out.match(/\[model_providers\.x\]/g) || []).length, 1);
  assert.match(out, /\[keep\]\nk = 1/);
});

test('tomlSet nests objects as dotted tables', () => {
  const out = tomlSet('', { tables: { 'model_providers.p': { name: 'n', http_headers: { a: 'b' } } } });
  assert.match(out, /\[model_providers\.p\.http_headers\]\na = "b"/);
});

test('yamlSetFlat does not scatter blank lines', () => {
  const out = yamlSetFlat('', { 'openai-api-base': 'https://x/v1', model: 'openai/m' });
  assert.equal(out, 'openai-api-base: https://x/v1\nmodel: openai/m\n');
});

test('yamlKeyBlock renders list of maps', () => {
  const lines = yamlKeyBlock('models', [{ name: 'a b', provider: 'openai', roles: ['chat'] }], 0);
  assert.deepEqual(lines, [
    'models:',
    '  - name: "a b"',
    '    provider: openai',
    '    roles:',
    '      - chat',
  ]);
});

test('jsonc strips comments and trailing commas', () => {
  const src = '{\n // hi\n "a": [1,2,],\n /* b */ "c": 1,\n}\n';
  assert.deepEqual(parseJsonc(src, {}), { a: [1, 2], c: 1 });
  assert.ok(!stripJsonc(src).includes('//'));
  assert.ok(!stripJsonc(src).includes('/*'));
});

test('diffLines marks additions', () => {
  const d = diffLines('a\nb\n', 'a\nc\n');
  assert.ok(d.some((x) => x.t === '+' && x.s === 'c'));
});

test('resolveEndpoint routes through the gateway only when needed', () => {
  const state = emptyState();
  state.providers.push({
    id: 'p', name: 'P', protocol: 'openai-chat', baseUrl: 'https://p/v1',
    apiKey: 'k', headers: {}, models: [{ id: 'm' }],
  });
  const anthropicClient = { name: 'Claude Code', accepts: ['anthropic'], baseStyle: 'root' };
  const chatClient = { name: 'Aider', accepts: ['openai-chat'], baseStyle: 'v1' };

  const direct = resolveEndpoint(state, { providerId: 'p', modelId: 'm' }, chatClient);
  assert.equal(direct.viaGateway, false);
  assert.equal(direct.baseUrl, 'https://p/v1');

  assert.throws(
    () => resolveEndpoint(state, { providerId: 'p', modelId: 'm' }, anthropicClient),
    /does not speak openai-chat/,
  );

  state.gateway.enabled = true;
  state.gateway.protocols = ['anthropic'];
  const via = resolveEndpoint(state, { providerId: 'p', modelId: 'm' }, anthropicClient);
  assert.equal(via.viaGateway, true);
  assert.equal(via.baseUrl, 'http://127.0.0.1:4000');
  assert.equal(via.protocol, 'anthropic');
});
