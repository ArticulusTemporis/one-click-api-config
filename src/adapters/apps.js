// Apps that consume an OpenAI/Anthropic-compatible endpoint but have no
// scriptable config file on this machine. Each one resolves real values and
// exports either a JSON/env snippet or the exact steps.

import path from 'node:path';
import os from 'node:os';
import { contextCap } from '../core/context.js';
import { exists } from '../core/fsx.js';
import { envName, slug } from '../core/util.js';

function cap(ctx) {
  const factor = ctx.state?.settings?.contextFactor ?? 0.95;
  return contextCap(ctx.model, factor);
}

function envSnippet(ctx, names) {
  const { resolved, model } = ctx;
  const capv = cap(ctx);
  const lines = [];
  for (const n of names) lines.push(n + '=' + (resolved.apiKey || ''));
  lines.push('OPENAI_BASE_URL=' + resolved.baseUrl);
  lines.push('OPENAI_MODEL=' + model.id);
  if (capv) lines.push('CONTEXT_WINDOW=' + capv);
  return lines.join('\n');
}

function exportAdapter(def) {
  return {
    group: 'gui',
    writable: 'export',
    accepts: ['openai-chat', 'anthropic', 'openai-responses'],
    baseStyle: 'v1',
    paths: () => [],
    detect: () => true,
    ...def,
  };
}

export const dshGo = exportAdapter({
  id: 'dsh-go',
  name: 'dsh-Go（手机 App）',
  category: 'dsh',
  docs: 'https://github.com/ccch1mneyyy/dsh-Go',
  note: '设置 › 模型 › 添加渠道。Base URL 要带 /v1。',
  render(ctx) {
    const { resolved, model, provider } = ctx;
    const compat = provider.protocol === 'anthropic' ? 'Anthropic'
      : provider.protocol === 'openai-responses' ? 'Responses' : 'OpenAI';
    return {
      files: [],
      warnings: ['手机端没有可写的本地文件：把下面这组值填进 App 的「添加渠道」。'],
      guide: [
        '手机 dsh-Go → 设置 → 模型 → 添加渠道',
        '兼容协议：' + compat,
        'Base URL：' + resolved.baseUrl,
        'API Key：' + (resolved.apiKey ? '见导出文件 / 点「粘贴」' : '需自填'),
        '模型：点「获取模型」自动拉，或手动添加 ' + model.id,
        '请求头：留空',
        cap(ctx) ? '上下文：' + cap(ctx) : '',
      ].filter(Boolean),
      artifact: {
        name: 'dsh-go-channel.txt',
        content: [
          '名称：' + (ctx.channelName || 'example公司'),
          '兼容协议：' + compat + '（三选一：OpenAI / Anthropic / Responses）',
          'Base URL：' + resolved.baseUrl,
          'API Key：' + (resolved.apiKey || ''),
          '模型：' + model.id,
          cap(ctx) ? '上下文：' + cap(ctx) : '',
          '',
          '填完点「保存」。模型那栏可以点「获取模型」自动列出，不用手动加。',
        ].filter(Boolean).join('\n') + '\n',
      },
      guided: true,
    };
  },
});

export const hermes = exportAdapter({
  id: 'hermes-agent',
  name: 'Hermes Agent',
  category: 'cli',
  docs: 'https://hermes-agent.nousresearch.com/docs',
  note: '$HERMES_HOME/config.yaml，provider 用 api_mode 指定协议。',
  render(ctx) {
    const { resolved, model, provider } = ctx;
    return {
      files: [],
      warnings: ['未在本机验证 Hermes 的配置文件结构：导出片段，确认后再粘。'],
      guide: [
        'config.yaml 追加：',
        'providers:',
        '  aac-' + slug(provider.id) + ':',
        '    api_mode: ' + (provider.protocol === 'anthropic' ? 'anthropic_messages' : provider.protocol === 'openai-responses' ? 'codex_responses' : 'openai_chat_completions'),
        '    base_url: ' + resolved.baseUrl,
        '    models: [' + model.id + ']',
      ],
      artifact: {
        name: 'hermes-provider.yaml',
        content: [
          'providers:',
          '  aac-' + slug(provider.id) + ':',
          '    api_mode: ' + (provider.protocol === 'anthropic' ? 'anthropic_messages' : provider.protocol === 'openai-responses' ? 'codex_responses' : 'openai_chat_completions'),
          '    base_url: ' + resolved.baseUrl,
          '    env_vars: [' + (resolved.apiKeyEnv || envName(provider)) + ']',
          '    models:',
          '      - ' + model.id,
          '',
        ].join('\n'),
      },
      guided: true,
    };
  },
});

export const openclaw = exportAdapter({
  id: 'openclaw',
  name: 'OpenClaw',
  category: 'cli',
  docs: 'https://docs.openclaw.ai/gateway/config-tools/custom-providers',
  note: '官方入口是 openclaw config set … --strict-json',
  render(ctx) {
    const { resolved, model, provider } = ctx;
    const pid = 'aac-' + slug(provider.id);
    return {
      files: [],
      warnings: ['OpenClaw 建议用它的 CLI 写配置，不手改文件。'],
      guide: [
        'openclaw config set models.providers.' + pid + ' \\',
        '  \'{"baseUrl":"' + resolved.baseUrl + '","api":"' + (provider.protocol === 'anthropic' ? 'anthropic-messages' : provider.protocol === 'openai-responses' ? 'openai-responses' : 'openai-completions') + '","apiKey":"…","models":["' + model.id + '"]}\' --strict-json --merge',
      ],
      artifact: {
        name: 'openclaw-provider.json',
        content: JSON.stringify({
          models: { providers: { [pid]: { baseUrl: resolved.baseUrl, api: provider.protocol === 'anthropic' ? 'anthropic-messages' : 'openai-completions', models: [model.id] } } },
        }, null, 2) + '\n',
      },
      guided: true,
    };
  },
});

export const minimaxCode = exportAdapter({
  id: 'minimax-code',
  name: 'MiniMax Code',
  category: 'cli',
  docs: 'https://code.minimax.cn/docs/code/account/byok',
  note: 'config.yaml 里的 custom_provider.<k>.options',
  render(ctx) {
    const { resolved, model, provider } = ctx;
    const pid = 'aac_' + slug(provider.id).replace(/-/g, '_');
    return {
      files: [],
      warnings: ['YAML 缩进错一格就整块失效：用导出文件替换，别手敲。'],
      guide: [
        'config.yaml 里 custom_provider 下追加：',
        pid + ':',
        '  options:',
        '    baseURL: ' + resolved.baseUrl,
        '    apiKey: …',
        '  protocol: ' + (provider.protocol === 'anthropic' ? 'anthropic-messages' : provider.protocol === 'openai-responses' ? 'openai-responses' : 'openai-completions'),
      ],
      artifact: {
        name: 'minimax-code-provider.yaml',
        content: [
          'custom_provider:',
          '  ' + pid + ':',
          '    options:',
          '      baseURL: ' + resolved.baseUrl,
          '      apiKey: ""',
          '    protocol: ' + (provider.protocol === 'anthropic' ? 'anthropic-messages' : provider.protocol === 'openai-responses' ? 'openai-responses' : 'openai-completions'),
          'models:',
          '  ' + model.id + ':',
          '    limit:',
          '      context: ' + (cap(ctx) || 200000),
          '',
        ].join('\n'),
      },
      guided: true,
    };
  },
});

export const lobeChat = exportAdapter({
  id: 'lobe-chat',
  name: 'LobeChat',
  category: 'web',
  docs: 'https://lobehub.com/docs/self-hosting/environment-variables/model-provider',
  note: '自部署看环境变量，云版只能在界面里填。',
  render(ctx) {
    return {
      files: [],
      warnings: ['自部署：改环境变量后重启容器。云版只能在「AI 服务商 → 代理地址」手填。'],
      guide: ['OPENAI_PROXY_URL=' + ctx.resolved.baseUrl, 'OPENAI_API_KEY=' + (ctx.resolved.apiKey ? '…' : '需自填')],
      artifact: { name: 'lobechat.env', content: envSnippet(ctx, ['OPENAI_API_KEY']) + '\n' },
      guided: true,
    };
  },
});

export const openWebUI = exportAdapter({
  id: 'open-webui',
  name: 'Open WebUI',
  category: 'web',
  docs: 'https://docs.openwebui.com/reference/env-configuration',
  note: 'ConfigVar 首次启动后以数据库为准。',
  render(ctx) {
    return {
      files: [],
      warnings: ['OPENAI_API_BASE_URL 首次启动后会被数据库固定：要脚本可控，设 ENABLE_PERSISTENT_CONFIG=false。'],
      guide: [
        'OPENAI_API_BASE_URL=' + ctx.resolved.baseUrl,
        'OPENAI_API_KEY=…',
        '多个端点用分号分隔；不加 /v1 之外的后缀。',
      ],
      artifact: { name: 'openwebui.env', content: envSnippet(ctx, ['OPENAI_API_KEY']) + '\n' },
      guided: true,
    };
  },
});

export const anythingLLM = exportAdapter({
  id: 'anythingllm',
  name: 'AnythingLLM',
  category: 'web',
  docs: 'https://docs.anythingllm.com/setup/llm-configuration/cloud/openai-generic',
  note: '选 OpenAI (Generic) 时读 GENERIC_OPEN_AI_*',
  render(ctx) {
    const { resolved, model } = ctx;
    return {
      files: [],
      warnings: ['Docker 版改 .env；桌面版设置存在应用内数据库，界面优先。'],
      guide: [
        'LLM Provider 选 OpenAI (Generic)',
        'GENERIC_OPEN_AI_BASE_PATH=' + resolved.baseUrl,
        'GENERIC_OPEN_AI_MODEL_PREF=' + model.id,
        'GENERIC_OPEN_AI_API_KEY=…',
      ],
      artifact: {
        name: 'anythingllm.env',
        content: [
          'GENERIC_OPEN_AI_BASE_PATH=' + resolved.baseUrl,
          'GENERIC_OPEN_AI_API_KEY=' + (resolved.apiKey || ''),
          'GENERIC_OPEN_AI_MODEL_PREF=' + model.id,
          '',
        ].join('\n'),
      },
      guided: true,
    };
  },
});

export const jan = exportAdapter({
  id: 'jan',
  name: 'Jan',
  category: 'desktop',
  docs: 'https://jan.ai/docs',
  note: '设置 › 模型 › 添加远程引擎',
  render(ctx) {
    const { resolved, model } = ctx;
    return {
      files: [],
      warnings: ['Jan 只有界面入口。'],
      guide: ['设置 › 模型 › 添加引擎 › OpenAI 兼容', 'Base URL: ' + resolved.baseUrl, '模型: ' + model.id, 'Key: 见导出文件'],
      artifact: {
        name: 'jan-provider.json',
        content: JSON.stringify({ engine: 'openai', baseUrl: resolved.baseUrl, apiKey: resolved.apiKey || '', model: model.id }, null, 2) + '\n',
      },
      guided: true,
    };
  },
});

export const nextChat = exportAdapter({
  id: 'nextchat',
  name: 'NextChat',
  category: 'web',
  docs: 'https://github.com/ChatGPTNextWeb/NextChat',
  note: '设置 › 自定义接口',
  render(ctx) {
    const { resolved, model } = ctx;
    return {
      files: [],
      warnings: ['NextChat 的配置存在浏览器 localStorage，脚本写不了。'],
      guide: ['设置 › 自定义接口 打开，填接口地址 ' + resolved.baseUrl, '模型填 ' + model.id, 'Key 见导出文件'],
      artifact: {
        name: 'nextchat.json',
        content: JSON.stringify({ baseUrl: resolved.baseUrl, model: model.id, apiKey: resolved.apiKey || '' }, null, 2) + '\n',
      },
      guided: true,
    };
  },
});

export const chatboxExport = exportAdapter({
  id: 'chatbox',
  name: 'Chatbox',
  category: 'desktop',
  docs: 'https://docs.chatboxai.app/guides/providers/import-config',
  note: '有官方导入格式，可以直接喂给它',
  render(ctx) {
    const { resolved, model, provider } = ctx;
    const cfg = {
      id: 'aac-' + slug(provider.id),
      name: provider.name || provider.id,
      type: 'openai',
      settings: {
        apiHost: resolved.baseUrl,
        apiPath: '/chat/completions',
        apiKey: resolved.apiKey || '',
        models: [{ modelId: model.id, nickname: model.id }],
      },
    };
    return {
      files: [],
      warnings: ['Chatbox 需要你在应用里点「导入」，我们不写它的数据库。'],
      guide: ['Chatbox › 设置 › 提供商 › 导入配置（选导出的 JSON）'],
      artifact: { name: 'chatbox-provider.json', content: JSON.stringify(cfg, null, 2) + '\n' },
      guided: true,
    };
  },
});

export default [dshGo, hermes, openclaw, minimaxCode, lobeChat, openWebUI, anythingLLM, jan, nextChat, chatboxExport];
