// Clients whose config file format we could not verify on this machine.
// We never guess-write them: we emit a ready-to-import JSON artifact plus
// the exact place it belongs, and the wizard shows it as a checklist step.

import path from 'node:path';
import os from 'node:os';
import { exists } from '../core/fsx.js';
import { contextCap } from '../core/context.js';

function firstExisting(cands) {
  return cands.find((c) => exists(c)) || cands[0];
}

export const workbuddy = {
  id: 'workbuddy',
  name: 'WorkBuddy',
  group: 'gui',
  docs: 'https://www.yuque.com/u37752497/iylzr2',
  accepts: ['openai-chat'],
  baseStyle: 'v1',
  writable: 'export',
  note: '语雀文档 4：设置 → 模型 → 自定义模型。模型 ID 用 deepseek-v4.1-flash。',
  paths: () => [firstExisting([
    path.join(os.homedir(), 'WorkBuddy', 'config.json'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'WorkBuddy', 'config.json') : '',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'WorkBuddy', 'config.json') : '',
    path.join(os.homedir(), '.workbuddy', 'config.json'),
  ].filter(Boolean))],
  detect: () => exists(path.join(os.homedir(), 'WorkBuddy')) ||
    (!!process.env.APPDATA && exists(path.join(process.env.APPDATA, 'WorkBuddy'))) ||
    (!!process.env.LOCALAPPDATA && exists(path.join(process.env.LOCALAPPDATA, 'WorkBuddy'))),

  render(ctx) {
    const { resolved, model, provider, state } = ctx;
    const factor = state?.settings?.contextFactor ?? 0.95;
    const cap = contextCap(model, factor);
    const doc = {
      provider: {
        id: 'aac-' + provider.id,
        name: provider.name || provider.id,
        type: 'openai',
        baseUrl: resolved.baseUrl,
        apiKey: resolved.apiKey || '',
        model: model.id,
        maxContextTokens: cap || undefined,
        supportsVision: /image|vl|vision/i.test(model.id),
      },
      note: '在 WorkBuddy 设置 → 模型 → 自定义模型 里按这些值填；模型 ID 必须与站点一致。',
    };
    return {
      files: [],
      warnings: [
        'WorkBuddy 的配置文件格式未在本机验证，所以不直接写入，改为导出可粘帖的 JSON。',
      ],
      guide: [
        'WorkBuddy → 设置 → 模型 → 自定义模型 → 添加模型',
        `Base URL: ${resolved.baseUrl}`,
        `模型 ID: ${model.id}`,
        cap ? `上下文上限: ${cap}（站点上限的 ${Math.round(factor * 100)}%）` : '上下文上限：站点未给出，跳过',
        resolved.apiKey ? 'API Key: 用导出的 JSON 里的 apiKey 字段' : 'API Key: 需自行填写',
      ],
      artifact: { name: 'workbuddy-model.json', content: JSON.stringify(doc, null, 2) + '\n' },
      guided: true,
    };
  },
};

export const deepseekHarness = {
  id: 'deepseek-harness',
  name: 'DeepSeek Harness',
  group: 'gui',
  docs: 'https://www.yuque.com/u37752497/iylzr2',
  accepts: ['openai-chat'],
  baseStyle: 'v1',
  writable: 'export',
  note: '语雀文档 5：设置里加提供商。DSH 的设置文档由应用自己管理。',
  paths: () => [firstExisting([
    path.join(os.homedir(), '.dsh', 'settings.json'),
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'DeepSeek Harness', 'settings.json') : '',
    process.env.APPDATA ? path.join(process.env.APPDATA, 'DeepSeek Harness', 'settings.json') : '',
  ].filter(Boolean))],
  detect: () => exists(path.join(os.homedir(), '.dsh')),

  render(ctx) {
    const { resolved, model, provider, state } = ctx;
    const factor = state?.settings?.contextFactor ?? 0.95;
    const cap = contextCap(model, factor);
    const doc = {
      provider: {
        id: 'aac-' + provider.id,
        label: provider.name || provider.id,
        protocol: 'openai-compatible',
        baseUrl: resolved.baseUrl,
        apiKey: resolved.apiKey || '',
        models: [{ id: model.id, contextWindow: cap || undefined }],
      },
      note: 'DeepSeek Harness → 设置 → 模型/提供商 → 添加上面的端点。',
    };
    return {
      files: [],
      warnings: ['DSH 设置由应用自己保管，这里导出可粘帖的提供商 JSON，不直接改它的内部文件。'],
      guide: [
        'DeepSeek Harness → 设置 → 模型（提供商）→ 添加',
        `Base URL: ${resolved.baseUrl}`,
        `模型: ${model.id}`,
        cap ? `上下文窗口: ${cap}（站点上限的 ${Math.round(factor * 100)}%）` : '上下文窗口：跳过',
        '当前 DSH 已存在 EXAMPLE_API_KEY 引用，可直接复用同一把 key。',
      ],
      artifact: { name: 'deepseek-harness-provider.json', content: JSON.stringify(doc, null, 2) + '\n' },
      guided: true,
    };
  },
};

export default [workbuddy, deepseekHarness];
