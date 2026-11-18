import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson, hasComments } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { slug, envName } from '../core/util.js';

const candidates = () => [
  path.join(os.homedir(), '.config', 'opencode', 'opencode.jsonc'),
  path.join(os.homedir(), '.config', 'opencode', 'opencode.json'),
];

const PKG = {
  'openai-chat': '@opencode/ai/providers/openai-compatible',
  'openai-responses': '@opencode/ai/providers/openai-compatible/responses',
  anthropic: '@opencode/ai/providers/anthropic-compatible',
  gemini: '@opencode/ai/providers/google',
};

export default {
  id: 'opencode',
  name: 'OpenCode',
  group: 'cli',
  docs: 'https://opencode.ai/docs/providers/',
  accepts: ['openai-chat', 'openai-responses', 'anthropic', 'gemini'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'V2 uses providers.<id>.package + settings.baseURL. V1 keys are ignored by V2.',
  paths: () => [candidates()[0]],
  detect: () => exists(path.join(os.homedir(), '.config', 'opencode')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const existing = candidates().find((c) => ctx.read(c).exists) || candidates()[0];
    const before = ctx.read(existing).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const guide = [];
    const pid = slug(provider.id);
    const keyEnv = resolved.apiKeyEnv || envName(provider);

    if (!doc.$schema) doc.$schema = 'https://opencode.ai/config.json';
    doc.providers = doc.providers && typeof doc.providers === 'object' ? doc.providers : {};
    const entry = {
      name: provider.name || provider.id,
      env: [keyEnv],
      package: PKG[provider.protocol] || PKG['openai-chat'],
      settings: { baseURL: resolved.baseUrl },
      models: { [model.id]: { name: model.label || model.id } },
    };
    if (resolved.apiKey) {
      entry.settings.apiKey = resolved.apiKey;
      warnings.push(`API key is written into opencode.jsonc; exporting ${keyEnv} is cleaner`);
    }
    if (provider.headers && Object.keys(provider.headers).length) entry.headers = provider.headers;
    doc.providers[pid] = entry;
    doc.model = `${pid}/${model.id}`;

    if (hasComments(before)) {
      warnings.push('existing opencode.jsonc had comments; they are dropped when merged');
    }
    guide.push(`You can also use /connect and keep the key in the OS keychain instead.`);
    guide.push('Restart opencode, then pick the model in /models.');

    return { files: [{ path: existing, before, after: stringifyJson(doc), note: `providers.${pid}` }], warnings, guide };
  },
};
