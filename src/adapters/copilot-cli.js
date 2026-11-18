import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';

// Two official files exist: providers.json (BYOK model providers) and
// settings.json (CLI config dir reference). We edit whichever is already there,
// and create providers.json when neither exists.
const dir = () => path.join(os.homedir(), '.copilot');
const configPath = () => {
  const providers = path.join(dir(), 'providers.json');
  const settings = path.join(dir(), 'settings.json');
  if (exists(providers)) return providers;
  if (exists(settings)) return settings;
  return providers;
};

export default {
  id: 'copilot-cli',
  name: 'GitHub Copilot CLI',
  group: 'cli',
  docs: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-byok-models',
  accepts: ['openai-chat', 'openai-responses', 'anthropic'],
  baseStyle: 'v1',
  writable: 'auto',
  note: '不做 $VAR 插值，值按字面写入；已存在 settings.json 时优先改它。',
  paths: () => [configPath()],
  detect: () => exists(dir()),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = configPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const pid = provider.id;
    const type = provider.protocol === 'anthropic' ? 'anthropic' : 'openai';
    const entry = { name: provider.name || pid, type, baseUrl: resolved.baseUrl };
    if (resolved.apiKey) {
      entry.apiKey = resolved.apiKey;
      warnings.push('providers.json stores keys in plaintext and never expands $VARS');
    }
    if (provider.protocol === 'openai-responses') entry.wireApi = 'responses';
    else if (provider.protocol === 'openai-chat') entry.wireApi = 'completions';

    doc.providers = Array.isArray(doc.providers) ? doc.providers : [];
    const idx = doc.providers.findIndex((x) => x.name === pid);
    if (idx >= 0) doc.providers[idx] = entry; else doc.providers.push(entry);

    doc.models = Array.isArray(doc.models) ? doc.models : [];
    const mid = doc.models.findIndex((m) => m.id === model.id);
    const mEntry = { id: model.id, provider: pid };
    if (mid >= 0) doc.models[mid] = mEntry; else doc.models.push(mEntry);

    return {
      files: [{ path: p, before, after: stringifyJson(doc), note: `providers[] + models[]` }],
      warnings,
      guide: [`Restart the CLI; the model appears in /model. COPILOT_PROVIDERS_CONFIG moves this file.`],
    };
  },
};
