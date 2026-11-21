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
//
// Background workers: Stop fires every time the main session ends a turn, including a turn it
// ends only to wait for background subagents (main-session subagents can't run in the
// foreground). After /ship-ticket's red commit the suite is red on purpose, so gating those
// waits would block every one. So before running the suite we look at the session's subagent
// files: <transcript_path minus ".jsonl">/subagents/agent-<id>.meta.json, next to
// agent-<id>.jsonl. A running agent's meta.json has no "finished" key; it gets
// "finished": true about 1-2 s after the agent ends. If any meta.json parses, lacks
// finished === true and its sibling .jsonl was modified in the last 15 minutes, a worker is
// still running and the orchestrator is waiting, not done: exit 0 without running the suite.
// The 15-minute rule is the staleness guard: a meta.json left unfinished by a crashed or killed
// agent stops counting once its transcript goes quiet, so it can't switch the gate off for good.
// An unparseable meta.json, a missing folder or a missing transcript_path counts as "no workers"
// and the stop is gated as before.
// This relies on Claude Code's internal on-disk layout, which isn't a documented interface. If
// it changes, nothing matches and the gate falls back to gating every stop (safe, but noisy
// while workers run).
//
// Log: one line per gated invocation (i.e. while .ttm/active exists) is appended to
// <project>/.ttm/gate.log: ISO time, decision (skip-workers-running <n> | pass | block),
// stop_hook_active=<value>. A logging error is swallowed and never changes the decision.
// Project dir = CLAUDE_PROJECT_DIR, fallback input.cwd.

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { projectDirFor, readJsonStdin } from './lib.mjs';

const BUDGET_MS = 150_000;
const TAIL = 40;
const FRESH_MS = 15 * 60_000;

const input = await readJsonStdin();
const project = projectDirFor(input);
if (!existsSync(join(project, '.ttm', 'active'))) process.exit(0);

function log(decision) {
  try {
    const flag = input?.stop_hook_active === undefined ? 'unset' : String(input.stop_hook_active);
    appendFileSync(join(project, '.ttm', 'gate.log'), `${new Date().toISOString()} ${decision} stop_hook_active=${flag}\n`);
  } catch {
    // logging must never fail the hook
  }
}

// Number of subagents that look like they are still running (see the header). 0 on any doubt.
function runningWorkers(transcriptPath) {
  if (typeof transcriptPath !== 'string' || !transcriptPath.endsWith('.jsonl')) return 0;
  const dir = join(transcriptPath.slice(0, -'.jsonl'.length), 'subagents');
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return 0;
  }
  let n = 0;
  for (const name of names) {
    if (!name.endsWith('.meta.json')) continue;
    try {
      const meta = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      if (!meta || typeof meta !== 'object' || meta.finished === true) continue;
      const jsonl = join(dir, `${name.slice(0, -'.meta.json'.length)}.jsonl`);
      if (Date.now() - statSync(jsonl).mtimeMs <= FRESH_MS) n++;
    } catch {
      // unparseable meta or missing .jsonl: not a running worker
    }
  }
  return n;
}

const workers = runningWorkers(input?.transcript_path);
if (workers > 0) {
  log(`skip-workers-running ${workers}`);
  process.exit(0);
}

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
if (!failed.length) {
  log('pass');
  process.exit(0);
}
log('block');

const tail = (s) => s.replace(/\s+$/, '').split('\n').slice(-TAIL).join('\n');
process.stderr.write('Done gate: the suite must pass before this run can stop.\n');
for (const f of failed) process.stderr.write(`\n--- ${f.label} failed (last ${TAIL} lines) ---\n${tail(f.output)}\n`);
process.exit(2);
