import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { urlBase } from '../core/util.js';

const settingsPath = () => path.join(os.homedir(), '.gemini', 'settings.json');

export default {
  id: 'gemini',
  name: 'Gemini CLI',
  group: 'cli',
  docs: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md',
  accepts: ['gemini'],
  baseStyle: 'root',
  writable: 'partial',
  note: 'Base URL is env-only (GOOGLE_GEMINI_BASE_URL, HTTPS required). File can only carry key + model.',
  paths: () => [settingsPath()],
  detect: () => exists(path.join(os.homedir(), '.gemini')),

  render(ctx) {
    const { resolved, model } = ctx;
    const p = settingsPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const guide = [];

    if (resolved.apiKey) {
      doc.apiKey = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.gemini/settings.json');
    } else if (resolved.apiKeyEnv) {
      doc.apiKey = '${' + resolved.apiKeyEnv + '}';
      guide.push(`settings.json supports \${VAR} interpolation; keep ${resolved.apiKeyEnv} exported`);
    }
    doc.model = doc.model && typeof doc.model === 'object' ? doc.model : {};
    doc.model.name = model.id;

    const root = urlBase(resolved.baseUrl, 'root');
    guide.push(`Set the endpoint in your shell (settings.json cannot): GOOGLE_GEMINI_BASE_URL=${root}`);
    guide.push('Gemini CLI needs https:// or the request is rejected (localhost is the only exception).');
    guide.push('Restart the CLI: most keys are read once at startup.');
    if (resolved.viaGateway) guide.push('The gateway must implement Gemini generateContent, the hardest of the four protocols.');

    return { files: [{ path: p, before, after: stringifyJson(doc), note: 'apiKey + model.name' }], warnings, guide };
  },
};
