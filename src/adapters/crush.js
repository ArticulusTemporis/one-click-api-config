import path from 'node:path';
import os from 'node:os';
import { bashManagedBlock } from '../core/format.js';
import { exists } from '../core/fsx.js';
import { slug } from '../core/util.js';

// Windows keeps its config under %LOCALAPPDATA%\crush (official config page);
// other platforms use ~/.config/crush. The bash `crushrc` is the current main
// config; crush.json is legacy and gets overridden by it.
const crushDir = () => (process.platform === 'win32' && process.env.LOCALAPPDATA)
  ? path.join(process.env.LOCALAPPDATA, 'crush')
  : path.join(os.homedir(), '.config', 'crush');
const rcPath = () => path.join(crushDir(), 'crushrc');
const jsonPath = () => path.join(crushDir(), 'crush.json');

const TYPE = {
  'openai-chat': 'completions',
  'openai-responses': 'responses',
  anthropic: 'messages',
};

function q(s) {
  return '"' + String(s).replace(/(["\\$`])/g, '\\$1') + '"';
}

export default {
  id: 'crush',
  name: 'Crush',
  group: 'cli',
  docs: 'https://github.com/charmbracelet/crush/blob/main/docs/config/README.md',
  accepts: ['openai-chat', 'openai-responses', 'anthropic'],
  baseStyle: 'v1',
  writable: 'auto',
  note: '主配置是 bash 脚本 crushrc；Windows 下在 %LOCALAPPDATA%\\crush，crush.json 已废弃且会被覆盖。',
  paths: () => [rcPath()],
  detect: () => exists(crushDir()),

  render(ctx) {
    const { resolved, model, provider } = ctx;
    const p = rcPath();
    const before = ctx.read(p).text;
    const warnings = [];
    const pid = 'aac-' + slug(provider.id);
    const lines = [
      `provider add ${pid} --type ${TYPE[provider.protocol] || 'completions'} --base-url ${q(resolved.baseUrl)}`,
    ];
    if (resolved.apiKey) {
      lines[0] += ` --api-key ${q(resolved.apiKey)}`;
      warnings.push('API key is written in plaintext to ~/.config/crush/crushrc');
    } else if (resolved.apiKeyEnv) {
      lines[0] += ` --api-key "$(printenv ${resolved.apiKeyEnv})"`;
    }
    if (provider.headers && Object.keys(provider.headers).length) {
      for (const [k, v] of Object.entries(provider.headers)) lines[0] += ` --extra-header ${q(k)} ${q(v)}`;
    }
    lines.push(`model large ${pid}/${model.id}`);
    lines.push(`model small ${pid}/${model.id}`);

    if (exists(jsonPath()) && !exists(p)) {
      warnings.push('发现旧的 crush.json：它已被 crushrc 取代，我们只写 crushrc，不动那个文件。');
    }
    const after = bashManagedBlock(before, 'agent-api-config', lines);
    return {
      files: [{ path: p, before, after, note: 'managed provider/model block' }],
      warnings,
      guide: [
        'crushrc runs in Crush embedded bash; keys can use $(op read ...) if you prefer.',
        'Do not hand-edit ~/.local/share/crush: that is runtime state.',
      ],
    };
  },
};
