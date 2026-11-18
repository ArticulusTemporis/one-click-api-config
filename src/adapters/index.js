import { exists as fsStat } from '../core/fsx.js';
import claudeCode from './claude-code.js';
import codex from './codex.js';
import gemini from './gemini.js';
import qwenCode from './qwen-code.js';
import iflow from './iflow.js';
import kimiCli from './kimi-cli.js';
import grokBuild from './grok-build.js';
import opencode from './opencode.js';
import crush from './crush.js';
import aider from './aider.js';
import copilotCli from './copilot-cli.js';
import factoryDroid from './factory-droid.js';
import pi from './pi.js';
import continueIde from './continue.js';
import kilo from './kilo.js';
import zed from './zed.js';
import { rooCode } from './guided.js';
import guided from './guided.js';
import exported from './exported.js';
import apps from './apps.js';
import dshPlugins from './dsh-plugins.js';

const RAW = [
  claudeCode, codex, gemini, qwenCode, kimiCli, grokBuild, opencode, crush,
  aider, copilotCli, factoryDroid, pi, iflow,
  continueIde, kilo, zed, rooCode,
  ...exported,
  ...apps,
  ...dshPlugins,
  ...guided,
];

export const CATEGORIES = [
  { id: 'cli', label: '终端 / 编码 Agent' },
  { id: 'ide', label: '编辑器插件' },
  { id: 'desktop', label: '桌面客户端' },
  { id: 'web', label: '网页 / 自部署服务' },
  { id: 'dsh', label: 'DSH 家族' },
];

const CATEGORY = {
  'claude-code': 'cli', codex: 'cli', gemini: 'cli', 'qwen-code': 'cli', 'kimi-cli': 'cli',
  'grok-build': 'cli', opencode: 'cli', crush: 'cli', aider: 'cli', 'copilot-cli': 'cli',
  'factory-droid': 'cli', pi: 'cli', iflow: 'cli', 'hermes-agent': 'cli', openclaw: 'cli',
  'minimax-code': 'cli',
  continue: 'ide', kilo: 'ide', zed: 'ide', 'roo-code': 'ide', 'cline-vscode': 'ide',
  cursor: 'ide', trae: 'ide', windsurf: 'ide',
  'cherry-studio': 'desktop', chatbox: 'desktop', workbuddy: 'desktop', jan: 'desktop',
  'lobe-chat': 'web', 'open-webui': 'web', anythingllm: 'web', nextchat: 'web',
  'deepseek-harness': 'dsh', 'dsh-go': 'dsh', 'ds-bot': 'dsh', deepseekbot: 'dsh', 'dsh-channels': 'dsh',
};

export const ADAPTERS = RAW.map((a) => ({ ...a, category: CATEGORY[a.id] || 'cli' }));

export function adapterById(id) {
  return ADAPTERS.find((a) => a.id === id) || null;
}

export function adaptersForGroup(group) {
  return ADAPTERS.filter((a) => a.group === group);
}

export function toolCatalog() {
  return ADAPTERS.map((a) => ({
    id: a.id,
    name: a.name,
    group: a.group,
    category: a.category,
    docs: a.docs,
    accepts: a.accepts,
    writable: a.writable || 'auto',
    note: a.note || '',
    paths: (a.paths ? a.paths() : []).map((p) => ({ path: p, exists: safeExists(p) })),
  }));
}

function safeExists(p) {
  try {
    return fsStat(p);
  } catch { return false; }
}
