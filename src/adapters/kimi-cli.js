import path from 'node:path';
import os from 'node:os';
import { tomlSet } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { slug } from '../core/util.js';

const configPath = () => path.join(os.homedir(), '.kimi', 'config.toml');

const TYPE = {
  'openai-chat': 'openai_legacy',
  'openai-responses': 'openai_responses',
  anthropic: 'anthropic',
  gemini: 'gemini',
};

export default {
  id: 'kimi-cli',
  name: 'Kimi CLI',
  group: 'cli',
  docs: 'https://github.com/MoonshotAI/kimi-cli/blob/main/docs/en/configuration/providers.md',
  accepts: ['openai-chat', 'openai-responses', 'anthropic', 'gemini'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'provider type field decides the protocol; a wrong type is a wrong protocol.',
  paths: () => [configPath()],
  detect: () => exists(path.join(os.homedir(), '.kimi')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = configPath();
    const before = ctx.read(p).text;
    const warnings = [];
    const guide = [];
    const pid = 'aac-' + slug(provider.id);

    const providerTable = {
      type: TYPE[provider.protocol] || 'openai_legacy',
      base_url: resolved.baseUrl,
    };
    if (resolved.apiKey) {
      providerTable.api_key = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.kimi/config.toml');
    }
    if (provider.headers && Object.keys(provider.headers).length) providerTable.custom_headers = provider.headers;

    const modelTable = {
      provider: pid,
      model: model.id,
      ...(ctx.contextCap ? { max_context_size: ctx.contextCap } : { capabilities: ['thinking', 'image_in'] }),
    };

    const after = tomlSet(before, {
      root: { default_model: model.id },
      tables: {
        ['providers.' + pid]: providerTable,
        ['models.' + model.id]: modelTable,
      },
    });
    guide.push('Run /login only if you want the wizard to write this file; do not do both.');
    guide.push('Restart the CLI after editing config.toml.');

    return { files: [{ path: p, before, after, note: `[providers.${pid}] + [models.${model.id}]` }], warnings, guide };
  },
};
