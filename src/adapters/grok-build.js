import path from 'node:path';
import os from 'node:os';
import { tomlSet } from '../core/format.js';
import { exists } from '../core/fsx.js';

const configPath = () => path.join(os.homedir(), '.grok', 'config.toml');

const BACKEND = {
  'openai-chat': 'chat_completions',
  'openai-responses': 'responses',
  anthropic: 'messages',
};

export default {
  id: 'grok-build',
  name: 'Grok Build / Grok CLI',
  group: 'cli',
  docs: 'https://docs.x.ai/build/settings',
  accepts: ['openai-chat', 'openai-responses', 'anthropic'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'Config is read at session start; GROK_HOME moves the whole directory.',
  paths: () => [configPath()],
  detect: () => exists(path.join(os.homedir(), '.grok')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = configPath();
    const before = ctx.read(p).text;
    const warnings = [];
    const guide = [];

    const table = {
      base_url: resolved.baseUrl,
      api_backend: BACKEND[provider.protocol] || 'chat_completions',
    };
    if (resolved.apiKey) {
      table.api_key = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.grok/config.toml');
    } else if (resolved.apiKeyEnv) {
      table.env_key = resolved.apiKeyEnv;
    } else {
      table.env_key = 'XAI_API_KEY';
    }
    if (provider.headers && Object.keys(provider.headers).length) table.extra_headers = provider.headers;

    const after = tomlSet(before, {
      tables: {
        models: { default: model.id },
        ['model."' + model.id + '"']: table,
      },
    });
    guide.push('The default model lives in [models] default.');
    guide.push('Config is read at startup: restart the session.');

    return { files: [{ path: p, before, after, note: `[model."${model.id}"]` }], warnings, guide };
  },
};
