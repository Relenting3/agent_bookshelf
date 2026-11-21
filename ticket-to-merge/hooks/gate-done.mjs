#!/usr/bin/env node
// ticket-to-merge Stop hook: the done gate for /ship-ticket runs.
//
// Only gates while <project>/.ttm/active exists (written by /ship-ticket for the length of a
// run). Without it, exit 0 at once: normal sessions and /review-pr are never gated.
// With it, runs `npm run test:run` and then, if node_modules/.bin/tsc exists, `tsc --noEmit`
// (cwd = project, 150 s budget shared by both). Both green → exit 0. Either red → exit 2 with
// the last 40 lines of the failing output, which blocks the stop and hands that to Claude.
//
// Why it ignores stop_hook_active: that flag only says the previous stop was already blocked
// by a Stop hook. If we let the second stop through, an agent could stop with a red suite just
// by trying twice. Claude Code's own cap (8 consecutive Stop-hook blocks) is the loop guard,
// so the checks run every time.
//
// onFailure has no effect on Stop hooks, so hooks.json doesn't set it, and a crash or a hook
// timeout here lets the stop through. That's why the inner timeout (150 s) sits below the hook
// timeout (180 s in hooks.json): a hung suite still ends in a clean exit 2.
// Project dir = CLAUDE_PROJECT_DIR, fallback input.cwd.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectDirFor, readJsonStdin } from './lib.mjs';

const BUDGET_MS = 150_000;
const TAIL = 40;

const input = await readJsonStdin();
const project = projectDirFor(input);
if (!existsSync(join(project, '.ttm', 'active'))) process.exit(0);

const deadline = Date.now() + BUDGET_MS;

function run(label, cmd, args) {
  const timeout = Math.max(1_000, deadline - Date.now());
  const r = spawnSync(cmd, args, {
    cwd: project,
    encoding: 'utf8',
    timeout,
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGTERM')
    return { label, ok: false, output: `${output}\n${label} timed out after ${Math.round(timeout / 1000)} s.` };
  if (r.error) return { label, ok: false, output: `${label} could not start: ${r.error.message}` };
  return { label, ok: r.status === 0, output };
}

const results = [run('npm run test:run', 'npm', ['run', 'test:run'])];
const tsc = join(project, 'node_modules', '.bin', 'tsc');
if (existsSync(tsc)) results.push(run('tsc --noEmit', tsc, ['--noEmit']));

const failed = results.filter((r) => !r.ok);
if (!failed.length) process.exit(0);

const tail = (s) => s.replace(/\s+$/, '').split('\n').slice(-TAIL).join('\n');
process.stderr.write('Done gate: the suite must pass before this run can stop.\n');
for (const f of failed) process.stderr.write(`\n--- ${f.label} failed (last ${TAIL} lines) ---\n${tail(f.output)}\n`);
process.exit(2);
