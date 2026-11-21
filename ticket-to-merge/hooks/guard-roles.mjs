#!/usr/bin/env node
// ticket-to-merge PreToolUse role guard. Reads input.agent_type (plugin agents appear as
// "ticket-to-merge:<name>"; the bare name is accepted too).
//
//   implementer: may not modify tests/. Blocks Edit/Write/MultiEdit/NotebookEdit whose path
//     resolves under <project>/tests/, and Bash where a simple command has a write-like op
//     (lib.mjs WRITE_OPS, `install`) and names tests/ or a glob reaching into it, or redirects
//     into it. Reading tests and running them (npm run test:run) stay allowed.
//   reviewer-correctness, reviewer-security, reviewer-tests-rules, verifier: read-only. Blocks
//     Edit/Write/MultiEdit/NotebookEdit/Bash entirely (their `tools:` already exclude these;
//     this is the second layer).
//   anything else, or no agent_type (main session): allowed.
//
// Exit 2 with a one-line reason on stderr blocks; exit 0 allows. Fails closed on bad stdin.
// Known limits: same Bash limits as protect.mjs (variables, command output, `cd $DIR`).

import { isAbsolute, resolve } from 'node:path';
import {
  baseDirOf,
  block,
  canonical,
  failClosed,
  forms,
  hasGlobChars,
  isUnder,
  isWriteLike,
  listTree,
  norm,
  parseCommand,
  pathGlobMatches,
  readInput,
  rootsOf,
  subTokens,
  toAbs,
  toolInput,
} from './lib.mjs';

const PLUGIN = 'ticket-to-merge';
const READ_ONLY = new Set(['reviewer-correctness', 'reviewer-security', 'reviewer-tests-rules', 'verifier']);
const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const TESTS_MENTION = /(?:^|[^\w.-])tests(?=\/|\s|$)/i;

const input = await readInput();

failClosed(() => {
  const raw = typeof input.agent_type === 'string' ? input.agent_type : '';
  const role = raw.startsWith(`${PLUGIN}:`) ? raw.slice(PLUGIN.length + 1) : raw;
  const tool = input.tool_name;
  const ti = toolInput(input);

  if (READ_ONLY.has(role) && (WRITE_TOOLS.has(tool) || tool === 'Bash'))
    block(`${role} is read-only and may not use ${tool}: report the finding instead of changing anything.`);

  if (role !== 'implementer') return;

  const testDirs = rootsOf(input).map((r) => resolve(r, 'tests'));
  const testForms = [...new Set(testDirs.flatMap(forms))];
  const deny = (what) => block(`implementer may not modify tests/ (${what}): return TEST DISAGREES instead.`);
  const underTests = (abs) => forms(abs).some((f) => testForms.some((t) => isUnder(f, t)));

  if (WRITE_TOOLS.has(tool)) {
    for (const p of [ti.file_path, ti.notebook_path]) {
      if (typeof p === 'string' && p && underTests(toAbs(baseDirOf(input), p))) deny(p);
    }
    return;
  }
  if (tool !== 'Bash') return;
  if (typeof ti.command !== 'string') block('Bash call without a command string (fail closed).');

  let tree = null; // files under tests/, listed only if a glob needs them
  const reaches = (cwd, tok) => {
    if (cwd === null && !isAbsolute(tok)) return TESTS_MENTION.test(tok);
    if (hasGlobChars(tok)) {
      tree ??= [...new Set(testDirs.flatMap((d) => listTree(canonical(d)).concat(listTree(d))).map(norm))];
      return Boolean(pathGlobMatches(cwd ?? '/', tok, tree));
    }
    return underTests(toAbs(cwd ?? '/', tok));
  };

  for (const seg of parseCommand(ti.command, baseDirOf(input))) {
    for (const r of seg.redirects) if (subTokens(r.text).some((t) => reaches(seg.cwd, t))) deny(`redirect into ${r.text}`);
    if (!isWriteLike(seg.text, [seg])) continue;
    for (const w of seg.words)
      for (const t of subTokens(w.text)) if (reaches(seg.cwd, t)) deny(`${seg.name || 'command'} on ${t}`);
  }
});
