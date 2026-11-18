import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { slug, envName } from '../core/util.js';

const modelsPath = () => path.join(os.homedir(), '.pi', 'agent', 'models.json');

const API = {
  'openai-chat': 'openai-completions',
  'openai-responses': 'openai-responses',
  anthropic: 'anthropic-messages',
  gemini: 'google-generative-ai',
};

export default {
  id: 'pi',
  name: 'Pi',
  group: 'cli',
  docs: 'https://pi.dev/docs/latest/models-configuration',
  accepts: ['openai-chat', 'openai-responses', 'anthropic', 'gemini'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'Built-in provider ids CAN be overridden here (Codex cannot).',
  paths: () => [modelsPath()],
  detect: () => exists(path.join(os.homedir(), '.pi')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = modelsPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const pid = 'aac-' + slug(provider.id);
    const keyEnv = resolved.apiKeyEnv || envName(provider);

    doc.$schema = doc.$schema || 'https://pi.dev/schemas/models.schema.json';
    doc.providers = doc.providers && typeof doc.providers === 'object' ? doc.providers : {};
    const entry = {
      baseUrl: resolved.baseUrl,
      api: API[provider.protocol] || 'openai-completions',
      models: { [model.id]: { name: model.label || model.id } },
    };
    if (resolved.apiKey) {
      entry.apiKey = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.pi/agent/models.json');
    } else {
      entry.apiKey = '${' + keyEnv + '}';
    }
    doc.providers[pid] = entry;

    return {
      files: [{ path: p, before, after: stringifyJson(doc), note: `providers.${pid}` }],
      warnings,
      guide: ['Pi also has project-level .pi/settings.json, which can shadow the user-level file.'],
    };
  },
};
