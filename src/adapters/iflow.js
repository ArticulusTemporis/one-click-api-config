import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';

const settingsPath = () => path.join(os.homedir(), '.iflow', 'settings.json');

export default {
  id: 'iflow',
  name: 'iFlow CLI',
  group: 'cli',
  docs: 'http://docs.iflow.cn/en/cli/configuration/settings/',
  accepts: ['openai-chat'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'Flat settings: apiKey / baseUrl / modelName. Only OpenAI-compatible.',
  paths: () => [settingsPath()],
  detect: () => exists(path.join(os.homedir(), '.iflow')),

  render(ctx) {
    const { resolved, model } = ctx;
    const p = settingsPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    if (resolved.apiKey) {
      doc.apiKey = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.iflow/settings.json');
    }
    doc.baseUrl = resolved.baseUrl;
    doc.modelName = model.id;
    return {
      files: [{ path: p, before, after: stringifyJson(doc), note: 'apiKey + baseUrl + modelName' }],
      warnings,
      guide: ['Every key also has an IFLOW_ env form (IFLOW_baseUrl, IFLOW_modelName).'],
    };
  },
};
