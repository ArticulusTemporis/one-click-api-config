import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { slug, envName } from '../core/util.js';

function settingsPath() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'Zed', 'settings.json');
  }
  return path.join(os.homedir(), '.config', 'zed', 'settings.json');
}

export default {
  id: 'zed',
  name: 'Zed',
  group: 'ide',
  docs: 'https://zed.dev/docs/ai/use-api-access',
  accepts: ['openai-chat', 'anthropic'],
  baseStyle: 'v1',
  writable: 'partial',
  note: 'Never put the key here: Zed wants <PROVIDER_ID>_API_KEY in the env or the OS keychain.',
  paths: () => [settingsPath()],
  detect: () => exists(path.dirname(settingsPath())),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = settingsPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const pid = 'aac-' + slug(provider.id);
    const keyEnv = resolved.apiKeyEnv || envName(provider);

    doc.language_models = doc.language_models && typeof doc.language_models === 'object' ? doc.language_models : {};
    const bucket = provider.protocol === 'anthropic' ? 'anthropic_compatible' : 'openai_compatible';
    doc.language_models[bucket] = doc.language_models[bucket] && typeof doc.language_models[bucket] === 'object'
      ? doc.language_models[bucket] : {};
    const entry = {
      api_url: resolved.baseUrl,
      available_models: [{
        name: model.id,
        display_name: model.label || model.id,
        ...(ctx.contextCap ? { max_tokens: ctx.contextCap } : {}),
        capabilities: { tools: true, images: false, chat_completions: provider.protocol === 'openai-chat' },
      }],
    };
    if (provider.headers && Object.keys(provider.headers).length) entry.custom_headers = provider.headers;
    doc.language_models[bucket][pid] = entry;

    if (resolved.apiKey) {
      warnings.push(`key intentionally NOT written: export ${keyEnv.toUpperCase().replace(/-/g, '_')} instead`);
    }

    return {
      files: [{ path: p, before, after: stringifyJson(doc), note: `language_models.${bucket}.${pid}` }],
      warnings,
      guide: [
        'Zed never reads API keys from settings.json: use the OS keychain or <PROVIDER_ID>_API_KEY env var.',
        'Changes apply without a restart.',
      ],
    };
  },
};
