// Leaf module: no imports, so adapters can use it without a cycle.

const CONTEXT_HINTS = [
  { re: /^deepseek-v4\.1-flash/i, ctx: 1000000 },
  { re: /^deepseek-v4-pro/i, ctx: 1000000 },
  { re: /^deepseek/i, ctx: 65536 },
  { re: /^gpt-6/i, ctx: 272000 },
  { re: /^gpt-5/i, ctx: 272000 },
  { re: /^claude/i, ctx: 200000 },
  { re: /^gpt-image/i, ctx: 0 },
  { re: /^gemini/i, ctx: 1000000 },
];

export function guessContext(modelId) {
  const hit = CONTEXT_HINTS.find((h) => h.re.test(String(modelId || '')));
  return hit ? hit.ctx : 0;
}

export function contextCap(model, factor) {
  const f = Number(factor);
  const pct = Number.isFinite(f) ? Math.min(1, Math.max(0.5, f)) : 0.95;
  const raw = Number(model && model.contextWindow) || guessContext(model && model.id);
  return raw ? Math.round(raw * pct) : 0;
}
