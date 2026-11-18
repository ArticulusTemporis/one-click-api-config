import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';

const settingsPath = () => path.join(os.homedir(), '.factory', 'settings.json');

const PROVIDER = {
  'openai-chat': 'generic-chat-completion-api',
  'openai-responses': 'openai',
  anthropic: 'anthropic',
};

export default {
  id: 'factory-droid',
  name: 'Factory Droid',
  group: 'cli',
  docs: 'https://docs.factory.com/model-independence/byok',
  accepts: ['openai-chat', 'openai-responses', 'anthropic'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'camelCase settings.json. The old config.json is only read once for migration.',
  paths: () => [settingsPath()],
  detect: () => exists(path.join(os.homedir(), '.factory')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = settingsPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const keyEnv = resolved.apiKeyEnv || 'FACTORY_API_KEY';

    doc.customModels = Array.isArray(doc.customModels) ? doc.customModels : [];
    const entry = {
      model: model.id,
      displayName: model.label || model.id,
      baseUrl: resolved.baseUrl,
      provider: PROVIDER[provider.protocol] || 'generic-chat-completion-api',
    };
    if (resolved.apiKey) {
      entry.apiKey = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.factory/settings.json');
    } else {
      entry.apiKey = '${' + keyEnv + '}';
    }
    if (provider.protocol === 'anthropic') entry.authMode = 'bearer';
    if (ctx.contextCap) entry.maxOutputTokens = Math.min(64000, Math.floor(ctx.contextCap / 8));

    const idx = doc.customModels.findIndex((m) => m.model === model.id);
    if (idx >= 0) doc.customModels[idx] = entry; else doc.customModels.push(entry);

    return {
      files: [{ path: p, before, after: stringifyJson(doc), note: 'customModels[]' }],
      warnings,
      guide: ['apiKey supports ${VAR} expansion; no-auth gateways can omit it.'],
    };
  },
};
