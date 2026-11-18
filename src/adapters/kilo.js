import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { slug, envName } from '../core/util.js';

const confPath = () => path.join(os.homedir(), '.config', 'kilo', 'kilo.jsonc');

const NPM = {
  'openai-chat': '@ai-sdk/openai-compatible',
  'openai-responses': '@ai-sdk/openai',
  anthropic: '@ai-sdk/anthropic',
  gemini: '@ai-sdk/google',
};

export default {
  id: 'kilo',
  name: 'Kilo Code',
  group: 'ide',
  docs: 'https://kilo.ai/docs/getting-started/settings',
  accepts: ['openai-chat', 'openai-responses', 'anthropic', 'gemini'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'CLI, VS Code and JetBrains share the same kilo.jsonc.',
  paths: () => [confPath()],
  detect: () => exists(path.join(os.homedir(), '.config', 'kilo')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = confPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const pid = 'aac-' + slug(provider.id);
    const keyEnv = resolved.apiKeyEnv || envName(provider);

    doc.$schema = doc.$schema || 'https://app.kilo.ai/config.json';
    doc.provider = doc.provider && typeof doc.provider === 'object' ? doc.provider : {};
    const entry = {
      name: provider.name || provider.id,
      npm: NPM[provider.protocol] || NPM['openai-chat'],
      options: { baseURL: resolved.baseUrl },
      models: { [model.id]: { name: model.label || model.id } },
    };
    if (resolved.apiKey) {
      entry.options.apiKey = resolved.apiKey;
      warnings.push('config files are documented as plaintext (official warning): keep them out of VCS');
    } else {
      entry.options.apiKey = '{env:' + keyEnv + '}';
    }
    doc.provider[pid] = entry;
    doc.model = `${pid}/${model.id}`;

    return {
      files: [{ path: p, before, after: stringifyJson(doc), note: `provider.${pid}` }],
      warnings,
      guide: ['A project-level kilo.jsonc or .kilo/kilo.jsonc wins over this file.'],
    };
  },
};
