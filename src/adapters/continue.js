import path from 'node:path';
import os from 'node:os';
import { yamlSetTop, yamlKeyBlock } from '../core/format.js';
import { exists } from '../core/fsx.js';

const confPath = () => path.join(os.homedir(), '.continue', 'config.yaml');

export default {
  id: 'continue',
  name: 'Continue',
  group: 'ide',
  docs: 'https://docs.continue.dev/reference',
  accepts: ['openai-chat', 'anthropic'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'config.yaml (schema v1) beats a leftover config.json in the same folder.',
  paths: () => [confPath()],
  detect: () => exists(path.join(os.homedir(), '.continue')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = confPath();
    const before = ctx.read(p).text;
    const warnings = [];
    const isAnthropic = provider.protocol === 'anthropic';
    const entry = {
      name: `${provider.name || provider.id} / ${model.label || model.id}`,
      provider: isAnthropic ? 'anthropic' : 'openai',
      model: model.id,
      apiBase: resolved.baseUrl,
      roles: ['chat', 'edit', 'apply'],
      capabilities: ['tool_use'],
    };
    if (resolved.apiKey) {
      entry.apiKey = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.continue/config.yaml');
    } else if (resolved.apiKeyEnv) {
      entry.apiKey = '${{ secrets.' + resolved.apiKeyEnv + ' }}';
    }
    if (ctx.contextCap) entry.defaultCompletionOptions = { contextLength: ctx.contextCap };

    let text = before;
    if (!text.trim()) {
      text = ['name: aac', 'version: 1.0.0', 'schema: v1', ''].join('\n');
    }
    if (!/^schema\s*:/m.test(text)) text = 'schema: v1\n' + text;
    const block = yamlKeyBlock('models', [entry], 0).join('\n');
    const after = splice(text, block);

    return {
      files: [{ path: p, before, after, note: 'models[] block' }],
      warnings,
      guide: ['Reload the Continue panel; a full IDE restart is the reliable option.'],
    };
  },
};

function splice(text, block) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^models\s*:/.test(l));
  const head = block.split('\n');
  if (start === -1) return text.replace(/\n+$/, '') + '\n' + head.join('\n') + '\n';
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === '' || /^\s/.test(lines[end]))) end++;
  while (end > start + 1 && lines[end - 1].trim() === '') end--;
  return [...lines.slice(0, start), ...head, ...lines.slice(end)].join('\n');
}
