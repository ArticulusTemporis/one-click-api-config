import path from 'node:path';
import os from 'node:os';
import { parseJsonc, stringifyJson } from '../core/format.js';
import { exists } from '../core/fsx.js';

const settingsPath = () => path.join(os.homedir(), '.claude', 'settings.json');

export default {
  id: 'claude-code',
  name: 'Claude Code',
  group: 'cli',
  docs: 'https://code.claude.com/docs/en/settings',
  accepts: ['anthropic'],
  baseStyle: 'root',
  writable: 'auto',
  note: 'Only /v1/messages. Non-Anthropic upstream is unsupported by Anthropic, but works.',
  paths: () => [settingsPath()],
  detect: () => exists(path.join(os.homedir(), '.claude')),

  render(ctx) {
    const { resolved, model } = ctx;
    const p = settingsPath();
    const before = ctx.read(p).text;
    const doc = parseJsonc(before, {});
    const warnings = [];
    const guide = [];

    doc.env = doc.env && typeof doc.env === 'object' ? doc.env : {};
    doc.env.ANTHROPIC_BASE_URL = resolved.baseUrl;

    if (resolved.apiKey) {
      doc.env.ANTHROPIC_AUTH_TOKEN = resolved.apiKey;
      warnings.push('API key is written in plaintext to ~/.claude/settings.json');
    } else if (resolved.apiKeyEnv) {
      doc.env.ANTHROPIC_AUTH_TOKEN = `$${resolved.apiKeyEnv}`;
      warnings.push(`no key stored; export ${resolved.apiKeyEnv} in your shell`);
    } else {
      warnings.push('provider has no key: set ANTHROPIC_AUTH_TOKEN yourself');
    }

    doc.model = model.id;
    doc.env.ANTHROPIC_MODEL = model.id;
    doc.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = ctx.assignment.smallModelId || model.id;
    if (ctx.assignment.smallModelId) {
      doc.env.ANTHROPIC_DEFAULT_SONNET_MODEL = ctx.assignment.smallModelId;
      doc.env.ANTHROPIC_DEFAULT_OPUS_MODEL = model.id;
    }

    guide.push('settings.json is watched: env changes apply to the next session (model needs /model or a restart).');
    if (resolved.viaGateway) guide.push(`gateway ${resolved.baseUrl} must accept POST /v1/messages`);

    return {
      files: [{ path: p, before, after: stringifyJson(doc), note: 'env + model keys' }],
      warnings,
      guide,
    };
  },
};
