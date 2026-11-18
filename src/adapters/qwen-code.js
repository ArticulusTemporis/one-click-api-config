import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { slug, envName } from '../core/util.js';

const settingsPath = () => path.join(os.homedir(), '.qwen', 'settings.json');

const WIRE = {
  'openai-chat': 'chat-completions',
  'openai-responses': 'responses',
};
const PROTOCOL_KIND = {
  'openai-chat': 'openai',
  'openai-responses': 'openai',
  anthropic: 'anthropic',
  gemini: 'gemini',
};

export default {
  id: 'qwen-code',
  name: 'Qwen Code',
  group: 'cli',
  docs: 'https://github.com/QwenLM/qwen-code/blob/main/docs/users/configuration/model-providers.md',
  accepts: ['openai-chat', 'openai-responses', 'anthropic', 'gemini'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'modelProviders values must be a bare array; providerProtocol is read once at startup.',
  paths: () => [settingsPath()],
  detect: () => exists(path.join(os.homedir(), '.qwen')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = settingsPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const guide = [];
    const pid = slug(provider.id);
    const keyEnv = resolved.apiKeyEnv || envName(provider);

    doc.$version = doc.$version || 4;
    doc.modelProviders = doc.modelProviders && typeof doc.modelProviders === 'object' ? doc.modelProviders : {};
    doc.modelProviders[pid] = [{
      id: model.id,
      name: model.label || model.id,
      baseUrl: resolved.baseUrl,
      envKey: keyEnv,
      ...(WIRE[provider.protocol] ? { wireApi: WIRE[provider.protocol] } : {}),
      ...(ctx.contextCap ? { generationConfig: { contextWindowSize: ctx.contextCap } } : {}),
    }];
    doc.providerProtocol = doc.providerProtocol && typeof doc.providerProtocol === 'object' ? doc.providerProtocol : {};
    doc.providerProtocol[pid] = PROTOCOL_KIND[provider.protocol] || 'openai';

    if (resolved.apiKey) {
      doc.env = doc.env && typeof doc.env === 'object' ? doc.env : {};
      doc.env[keyEnv] = resolved.apiKey;
      warnings.push(`API key is written to settings.json env.${keyEnv} (Qwen never stores it elsewhere)`);
    } else {
      guide.push(`export ${keyEnv} in your shell, Qwen reads it from the process env`);
    }
    guide.push('modelProviders hot-reloads (~300ms); providerProtocol needs a restart.');
    guide.push(`modelProviders must stay in the user-level file to avoid project/user merge conflicts.`);

    return { files: [{ path: p, before, after: stringifyJson(doc), note: `modelProviders.${pid}` }], warnings, guide };
  },
};
