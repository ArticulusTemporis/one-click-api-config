import path from 'node:path';
import os from 'node:os';
import { tomlSet } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { slug } from '../core/util.js';

const configPath = () => path.join(os.homedir(), '.codex', 'config.toml');

export default {
  id: 'codex',
  name: 'Codex CLI',
  group: 'cli',
  docs: 'https://github.com/openai/codex/blob/main/docs/config.md',
  accepts: ['openai-responses'],
  baseStyle: 'v1',
  writable: 'auto',
  note: 'wire_api "chat" was removed: only /v1/responses is accepted now.',
  paths: () => [configPath()],
  detect: () => exists(path.join(os.homedir(), '.codex')),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = configPath();
    const before = ctx.read(p).text;
    const warnings = [];
    const guide = [];
    const id = 'aac-' + slug(provider.id);
    const table = {
      name: provider.name || provider.id,
      base_url: resolved.baseUrl,
      wire_api: 'responses',
      requires_openai_auth: false,
    };
    if (resolved.apiKey) {
      table.experimental_bearer_token = resolved.apiKey;
      warnings.push('API key is written into config.toml (experimental_bearer_token)');
    } else if (resolved.apiKeyEnv) {
      table.env_key = resolved.apiKeyEnv;
    }
    if (provider.headers && Object.keys(provider.headers).length) table.http_headers = provider.headers;

    const after = tomlSet(before, {
      root: {
        model: model.id,
        model_provider: id,
        ...(ctx.contextCap ? { model_context_window: ctx.contextCap } : {}),
      },
      tables: { ['model_providers.' + id]: table },
    });
    guide.push('Codex reads config.toml at startup: restart the session.');
    guide.push('Built-in provider ids cannot be overridden, so we always create a new id.');
    if (resolved.viaGateway) guide.push(`gateway must accept POST /v1/responses for model ${model.id}`);

    return { files: [{ path: p, before, after, note: `[model_providers.${id}]` }], warnings, guide };
  },
};
