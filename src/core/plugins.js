// Recommended DSH plugins / experimental features.
//
// kind='package'  → installed with `dsh plugin --profile <p> add <pkg>`; DSH does the download.
// kind='builtin'  → an experimental toggle that only exists inside DSH settings;
//                   we never flip it from here, we only point at it.

export const PLUGINS = [
  { id: 'dsh-context', name: '上下文（dsh-context）', kind: 'package', pkg: 'dsh-context',
    desc: '上下文仪表盘与 /context 命令，看清上下文构成。' },
  { id: 'voice-input', name: '语音输入', kind: 'builtin',
    desc: '本机 SenseVoice 转写，首次使用需装依赖。' },
  { id: 'auto-approve', name: '自动授权审查', kind: 'builtin',
    desc: '每次工具调用前由模型按你的要求审查，准的自动放行。' },
  { id: 'worktree', name: '变更请求与工作树', kind: 'builtin',
    desc: '在会话里跟踪 GitHub PR、评审意见与代码差异。' },
  { id: 'recommend', name: '个性化推荐', kind: 'builtin',
    desc: '按你的需求推荐可长期使用的页面/小工具。' },
  { id: 'devtools', name: '开发者工具', kind: 'builtin',
    desc: '会话数据诊断、每轮耗时与缓存成本。' },
  { id: 'thinking-translate', name: '思考过程机器翻译', kind: 'builtin',
    desc: '把思考折叠块按语言翻译。' },
  { id: 'session-search', name: '会话搜索', kind: 'builtin',
    desc: '跨历史会话检索。' },
  { id: 'live-title', name: '随对话更新的标题', kind: 'builtin',
    desc: '按全部消息生成标题，而不是只看第一条。' },
  { id: 'badge', name: 'DSH 徽章技能', kind: 'builtin',
    desc: '为文档/PR 添加 powered by dsh 徽章。' },
  { id: 'ds-import', name: 'DeepSeek 会话导入', kind: 'builtin',
    desc: '导入官方导出的 ZIP，每段对话变成一个会话。' },
  { id: 'codex-subagent', name: 'Codex 子智能体', kind: 'builtin',
    desc: '用 Codex 的原生认证委派任务。' },
  { id: 'claude-subagent', name: 'Claude Code 子智能体', kind: 'builtin',
    desc: '用 Claude Code 的原生认证委派任务。' },
];
