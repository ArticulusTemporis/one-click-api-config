import { findProvider } from './ir.js';

export const ENDPOINT_CANDIDATES = [
  { id: 'example1', label: 'example1.com', url: 'https://example1.com', note: '主站' },
  { id: 'example2', label: 'example2.com', url: 'https://example2.com', note: '备用站' },
];

export const TIERS = [
  { id: 'budget', label: '特价组 0.088x', group: 'DeepSeek特价组【9.9≈2亿】', model: 'deepseek-v4.1-flash', note: '想稳定跑到两亿就选这个组' },
  { id: 'quality', label: '高端组 0.37x', group: 'Deepseek高端组【9.9≈1亿】', model: 'deepseek-v4-pro', note: '全天按高峰算，贵' },
  { id: 'image', label: '图片号池 0.168x', group: 'gpt满血不降智相关模型Pro号池', model: 'gpt-image-2', note: '按张计费 $0.12/张' },
];

export function steps(state) {
  const runs = state.runs || {};
  const settings = state.settings || {};
  const primary = (state.providers || [])[0] || null;
  const assigned = Object.keys(state.assignments || {});
  const model = settings.selectedModel || settings.tierModel || '';
  const loggedIn = !!state.sites?.[settings.endpoint || '']?.token;
  const toolOk = (runs.lastDiagnose?.tools || []).filter((t) => t.ok);

  return [
    {
      id: 'model',
      n: 1,
      title: '选择模型',
      hint: '登录站点，挑一把 key，再挑一个模型。',
      done: !!(primary && primary.apiKey && model),
      detail: model ? model : (loggedIn ? '还没选模型' : (primary ? '还没选模型' : '未登录')),
    },
    {
      id: 'agent',
      n: 2,
      title: '选择 Agent',
      hint: '读本机装了哪些，没读到的可以自己指路径。',
      done: assigned.length > 0,
      detail: assigned.length ? `${assigned.length} 个` : '未选择',
    },
    {
      id: 'verify',
      n: 3,
      title: '连通性验证',
      hint: '发一条最小请求，绿了才算通。',
      done: toolOk.length > 0,
      detail: toolOk.length ? `${toolOk.length} 个通过` : '未验证',
    },
    {
      id: 'more',
      n: 4,
      title: '更多',
      hint: '后续更新。',
      done: false,
      detail: '待补充',
      optional: true,
    },
  ];
}

export function stepSummary(list) {
  const real = list.filter((s) => !s.optional);
  const done = real.filter((s) => s.done).length;
  return {
    done,
    total: real.length,
    allDone: done === real.length,
    percent: real.length ? Math.round((done / real.length) * 100) : 0,
  };
}

export function tierById(id) {
  return TIERS.find((t) => t.id === id) || null;
}

export { findProvider };
