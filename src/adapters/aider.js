import path from 'node:path';
import os from 'node:os';
import { yamlSetFlat } from '../core/format.js';
import { exists } from '../core/fsx.js';

const confPath = () => path.join(os.homedir(), '.aider.conf.yml');

export default {
  id: 'aider',
  name: 'Aider',
  group: 'cli',
  docs: 'https://aider.chat/docs/config/options.html',
  accepts: ['openai-chat'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'Model prefix (openai/…) must match the endpoint, or the key never gets used.',
  paths: () => [confPath()],
  detect: () => exists(confPath()),

  render(ctx) {
    const { resolved, model } = ctx;
    const p = confPath();
    const before = ctx.read(p).text;
    const warnings = [];
    const pairs = {
      model: `openai/${model.id}`,
      'openai-api-base': resolved.baseUrl,
    };
    if (resolved.apiKey) {
      pairs['openai-api-key'] = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.aider.conf.yml');
    }
    const after = yamlSetFlat(before, pairs);
    return {
      files: [{ path: p, before, after, note: 'model + openai-api-base' }],
      warnings,
      guide: [
        'Aider reads git-root .aider.conf.yml first, then cwd, then home: a nearer file wins.',
        'Environment alternative: AIDER_OPENAI_API_BASE / OPENAI_API_BASE.',
      ],
    };
  },
};
