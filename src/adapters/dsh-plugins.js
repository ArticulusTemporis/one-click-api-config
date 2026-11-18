// DSH plugins that also consume the model API — but through DSH's own provider
// config, so the right move is to point them at the provider we just wrote
// instead of editing their private state.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exists } from '../core/fsx.js';

const DSH = path.join(os.homedir(), '.dsh');

function profileDeps() {
  const out = [];
  let dirs = [];
  try { dirs = fs.readdirSync(path.join(DSH, 'profiles')); } catch { return out; }
  for (const p of dirs) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(DSH, 'profiles', p, 'package.json'), 'utf8'));
      const deps = j.dependencies || {};
      out.push({ profile: p, deps: Object.keys(deps), bundles: (j.dsh && j.dsh.profile && j.dsh.profile.bundles) || [] });
    } catch { /* no package.json */ }
  }
  return out;
}

function hasPlugin(names) {
  for (const row of profileDeps()) {
    for (const n of names) {
      if (row.deps.includes(n) || row.bundles.includes(n)) return row.profile;
    }
  }
  return '';
}

function dataDir(name) {
  const p = path.join(DSH, name);
  try {
    // an empty folder proves nothing: DSH creates some of these by default
    return fs.readdirSync(p).length ? p : '';
  } catch {
    return '';
  }
}

function card(ctx, extra) {
  const chan = ctx.channelName || 'example公司';
  return [
    '名称：' + chan,
    'Base URL：' + ctx.resolved.baseUrl,
    '模型：' + ctx.model.id,
    ...extra,
  ];
}

export const dsBot = {
  id: 'ds-bot',
  name: 'DS Bot（Bot 团队）',
  group: 'gui',
  category: 'dsh',
  docs: 'https://github.com/Fei2411/DeepSeek-Bot',
  accepts: ['openai-chat', 'anthropic', 'openai-responses'],
  baseStyle: 'v1',
  writable: 'guided',
  note: '数据在 ~/.dsh/bot/；模型走 DSH 的提供商，不需要单独填 key。',
  paths: () => [path.join(DSH, 'bot', 'state.json')],
  detect: () => !!dataDir(path.join('bot')) || !!hasPlugin(['ds-bot', '@lininn/ds-bot']),

  render(ctx) {
    const dir = dataDir('bot');
    const profile = hasPlugin(['ds-bot', '@lininn/ds-bot']);
    return {
      files: [],
      warnings: ['DS Bot 的模型来自 DSH 的提供商配置，本工具已经把提供商写好，不用再填一遍 key。'],
      guide: [
        'dsh 插件安装：设置 → 插件 → 添加，输入 `ds-bot`（或 `dsh plugin --profile web add ds-bot`）',
        dir ? '检测到数据目录：' + dir : '未检测到 ~/.dsh/bot（还没装或还没首次打开）',
        profile ? '已在 profile «' + profile + '» 的依赖里看到它' : '',
        '装好后在 DS Bot 里选模型即可，模型名用 ' + ctx.model.id,
        '要换线路就回到本工具重跑一次，DSH 提供商一改，所有 Bot 跟着变',
      ].filter(Boolean),
      ...card(ctx),
      guided: true,
    };
  },
};

export const deepseekBot = {
  id: 'deepseekbot',
  name: 'DeepSeekBot（DSB）',
  group: 'gui',
  category: 'dsh',
  docs: 'https://github.com/BotHarness/DeepSeekBot',
  accepts: ['openai-chat', 'anthropic', 'openai-responses'],
  baseStyle: 'v1',
  writable: 'guided',
  note: '和 ds-bot 是两个项目；npm 包名 deepseekbot。',
  paths: () => [path.join(DSH, 'deepseekbot')],
  detect: () => !!hasPlugin(['deepseekbot']),

  render(ctx) {
    const profile = hasPlugin(['deepseekbot']);
    return {
      files: [],
      warnings: ['DSB 也用 DSH 的提供商；本工具已写好，不用重复填。'],
      guide: [
        '设置 → 插件 → 添加：`deepseekbot@1.4.1`（或 dsh plugin --profile web add deepseekbot）',
        profile ? '已在 profile «' + profile + '» 中启用' : '未在 profile 依赖里发现',
        '侧栏会出现「Bot 模式」；模型跟着 DSH 提供商走',
      ].filter(Boolean),
      ...card(ctx),
      guided: true,
    };
  },
};

export const dshChannels = {
  id: 'dsh-channels',
  name: 'DSH IM 频道（飞书/微信/钉钉/TG）',
  group: 'gui',
  category: 'dsh',
  docs: 'https://github.com/codepunk-gm/dsh-channels',
  accepts: ['openai-chat', 'anthropic', 'openai-responses'],
  baseStyle: 'v1',
  writable: 'guided',
  note: '数据在 ~/.dsh/im/；频道凭据在插件自己的设置页里填。',
  paths: () => [path.join(DSH, 'im')],
  detect: () => !!dataDir('im') || !!hasPlugin(['@codepunk-gm/dsh-channels', '@wsz987/dsh-channels', 'dsh-channels']),

  render(ctx) {
    const dir = dataDir('im');
    const profile = hasPlugin(['@codepunk-gm/dsh-channels', '@wsz987/dsh-channels', 'dsh-channels']);
    return {
      files: [],
      warnings: ['频道凭据（app id / secret）由插件自己的设置页管理，我们只负责模型端点。'],
      guide: [
        '安装：dsh plugin --profile web add -w @wsz987/dsh-channels（或 codepunk-gm/dsh-channels）',
        '装好后：设置 → 插件 → Channels，四个标签页分别填凭据',
        dir ? '检测到数据目录：' + dir : '未检测到 ~/.dsh/im',
        profile ? '已在 profile «' + profile + '» 中启用' : '',
        '模型端点在 DSH 提供商里，已经配成 ' + ctx.model.id,
      ].filter(Boolean),
      ...card(ctx),
      guided: true,
    };
  },
};

export default [dsBot, deepseekBot, dshChannels];
