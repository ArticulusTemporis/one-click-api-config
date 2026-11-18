import path from 'node:path';
import fs from 'node:fs';
import { buildPlan, hash } from './plan.js';
import { backupFile, atomicWrite, readSafe, ensureDir, aacHome, expand } from './fsx.js';

/**
 * Apply a plan. Refuses a file when its current content no longer matches
 * what the plan was computed from (someone edited it meanwhile).
 */
export function applyPlan(state, opts = {}) {
  const plan = opts.plan || buildPlan(state, opts);
  const dryRun = !!opts.dryRun;
  const results = [];

  for (const item of plan.items) {
    if (item.error) {
      results.push({ toolId: item.toolId, skipped: true, reason: item.error });
      continue;
    }
    if (item.guided) {
      // no config file to touch, but the exported snippet is still a deliverable
      if (item.artifact && !dryRun) {
        const dir = path.join(aacHome(), 'exports');
        ensureDir(dir);
        const dest = path.join(dir, item.artifact.name);
        fs.writeFileSync(dest, item.artifact.content, 'utf8');
        results.push({ toolId: item.toolId, path: dest, written: true, created: true, backup: null });
      } else {
        results.push({ toolId: item.toolId, skipped: true, reason: 'guided only' });
      }
      continue;
    }
    for (const file of item.files) {
      if (!file.changed) {
        results.push({ toolId: item.toolId, path: file.path, skipped: true, reason: 'already up to date' });
        continue;
      }
      const cur = readSafe(file.path);
      if (cur.exists && hash(cur.text) !== file.beforeHash) {
        results.push({ toolId: item.toolId, path: file.path, skipped: true, reason: 'conflict: file changed after planning' });
        continue;
      }
      if (dryRun) {
        results.push({ toolId: item.toolId, path: file.path, dryRun: true, changed: true });
        continue;
      }
      let backup = null;
      if (cur.exists) {
        try { backup = backupFile(file.path, cur.text); } catch (e) { /* backup is best effort but recorded */ backup = 'FAILED: ' + e.message; }
      }
      atomicWrite(file.path, file.after);
      results.push({ toolId: item.toolId, path: file.path, written: true, created: !cur.exists, backup });
    }
    if (item.artifact && !dryRun) {
      const dir = path.join(aacHome(), 'exports');
      ensureDir(dir);
      const dest = path.join(dir, item.artifact.name);
      fs.writeFileSync(dest, item.artifact.content, 'utf8');
      results.push({ toolId: item.toolId, path: dest, written: true, created: true, backup: null });
    }
  }
  return { results, plan };
}

export function renderPlanText(plan) {
  const out = [];
  const s = plan.summary;
  out.push(`# plan  ${plan.generatedAt}`);
  out.push(`# tools=${s.tools} files=${s.files} changed=${s.changed} guided=${s.guided} errors=${s.errors}`);
  for (const item of plan.items) {
    out.push('');
    out.push(`## ${item.toolName} (${item.toolId})  [${item.writable}]`);
    if (item.error) { out.push(`  ERROR: ${item.error}`); continue; }
    if (item.resolved) {
      out.push(`  endpoint: ${item.resolved.baseUrl}  protocol=${item.resolved.protocol}${item.resolved.viaGateway ? ' (via gateway)' : ''}`);
    }
    for (const w of item.warnings) out.push(`  ! ${w}`);
    for (const f of item.files) {
      out.push(`  ${f.changed ? (f.isNew ? 'CREATE' : 'UPDATE') : 'OK    '} ${f.path}`);
    }
    for (const g of item.guide) out.push(`  > ${g}`);
  }
  return out.join('\n') + '\n';
}

export { expand };
