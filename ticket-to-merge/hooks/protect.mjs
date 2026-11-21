#!/usr/bin/env node
// ticket-to-merge PreToolUse guardrail (modelled on week 1's .claude/hooks/protect-htmx.mjs).
//
// Blocks (exit 2, one-line reason on stderr; exit 0 allows):
//   - WRITES to the project-root bookshelf.db, bookshelf.db-shm, bookshelf.db-wal and to
//     src/db/seed.sql. Reading them is allowed.
//   - Any READ or WRITE of a file whose basename starts with ".env" (any directory).
//
// Path tools (Read, Edit, Write, MultiEdit, NotebookEdit, Grep, Glob): paths are resolved
// against input.cwd (fallback CLAUDE_PROJECT_DIR), symlinks followed with realpath, hard
// links caught by inode, compared case-insensitively on darwin/win32. Grep/Glob are also
// blocked when their glob/pattern can match a .env* name.
//
// Bash: a normalised copy of the command (quotes and backslashes removed, \xNN \NNN \uNNNN
// escapes decoded) is checked for:
//   - any mention of a .env name (process.env does not count; --exclude=.env* doesn't either);
//   - a write-protected basename (any directory) together with a write-like op: a > / >>
//     redirect to it, sed/perl -i, tee rm mv cp truncate dd ln chmod touch unlink...,
//     `install` as a command name, git checkout/restore/rm/mv/apply, sqlite3, interpreter
//     write calls (writeFile, open(..,'w'));
//   - shell glob tokens (* ? [ ] and {a,b}) that can expand to one of those names. A glob
//     with a / is matched against the full path (so dist/* is fine, src/db/* is not);
//   - git clean with -x / -X (deletes the gitignored bookshelf.db and .env files);
//   - rm, rmdir, unlink, shred, mv (any arg), cp/rsync (destination), chmod/chown -R (any arg)
//     on a directory that contains a write-protected file (src/db, src, the project root and
//     its ancestors), following `cd` within the command;
//   - recursive reads that would include a .env* file: grep -r/-R (and egrep/fgrep), rg with
//     --hidden/-u/-uu, on the project root, an ancestor of it, a directory holding a .env*
//     file, or no target at all, unless the command excludes .env* (--exclude='.env*',
//     rg -g '!.env*').
//
// Fails closed: unparseable stdin or an internal error blocks the call.
//
// Known limits:
//   - @-mentions (@.env in a prompt) are read by Claude Code without a tool call, so no
//     PreToolUse hook sees them.
//   - Names built through variables or command output ($F, $(ls | grep en), base64 -d, ...)
//     can't be seen by a regex; `cd $DIR` makes the cwd unknown (relative targets of the
//     directory checks are then blocked).
//   - Programs that open .env on their own (dotenv, npm scripts), other recursive readers
//     (tar, zip, cp -r of a whole tree, find -exec cat, git grep, ag/ack) and other
//     destructive commands (find -delete, git reset --hard, git stash) aren't caught unless
//     they name a protected file. Grep (the tool) over a directory without a glob is allowed.
//   - Subshell `cd` isn't undone at the closing parenthesis, and heredoc bodies are parsed as
//     commands (both only over-block).
//   - It's a heuristic: any command that names a protected file and has a write-like op
//     anywhere is blocked, even if the write targets another file; mv/cp into src/ or the
//     project root is blocked even when the moved file is unrelated.

import { basename, dirname, isAbsolute, resolve } from 'node:path';
import {
  baseDirOf,
  block,
  canonical,
  expandBraces,
  failClosed,
  findEnvFile,
  forms,
  hasGlobChars,
  inode,
  isUnder,
  isWriteLike,
  norm,
  normalise,
  parseCommand,
  pathGlobMatches,
  positionals,
  readInput,
  rootsOf,
  segmentToRegex,
  subTokens,
  toAbs,
  toolInput,
} from './lib.mjs';

const HINT = 'ask the human to change it by hand.';

// ---------- protected names ----------

const WRITE_PROTECTED_REL = ['bookshelf.db', 'bookshelf.db-shm', 'bookshelf.db-wal', 'src/db/seed.sql'];
const WRITE_PROTECTED_NAMES = ['bookshelf.db', 'bookshelf.db-shm', 'bookshelf.db-wal', 'seed.sql'];
const ENV_SAMPLE_NAMES = ['.env', '.env.local', '.env.development', '.env.production', '.env.test', '.env.example', '.envrc'];

const isEnvName = (name) => typeof name === 'string' && name.toLowerCase().startsWith('.env');
const displayName = (name) => (name.toLowerCase() === 'seed.sql' ? 'src/db/seed.sql' : name);

const envReason = (name) =>
  `${name} is a .env file (may hold secrets); agents may not read or write it. If it needs a change, ${HINT}`;
const writeReason = (name) => `${displayName(name)} is write-protected (seed data / local database); ${HINT}`;

// ---------- basename globs ----------

// Does a glob's last segment match a protected basename?
// strict=false applies the shell rule that a leading * or ? doesn't match a leading dot.
// Returns { env: segment|null, write: name|null }.
function globMatches(glob, strict) {
  const hit = { env: null, write: null };
  for (const alt of expandBraces(glob)) {
    const seg = alt.replace(/\/+$/, '').split('/').pop();
    if (!seg || !/[*?[]/.test(seg)) continue;
    let re;
    try {
      re = segmentToRegex(seg);
    } catch {
      continue;
    }
    const leadingWild = seg[0] === '*' || seg[0] === '?';
    const prefix = seg.slice(0, seg.search(/[*?[]/)).toLowerCase();
    if (!hit.env) {
      if (prefix && (prefix.startsWith('.env') || '.env'.startsWith(prefix))) hit.env = seg;
      else if (strict || !leadingWild) hit.env = ENV_SAMPLE_NAMES.find((n) => re.test(n)) ? seg : null;
    }
    if (!hit.write) hit.write = WRITE_PROTECTED_NAMES.find((n) => re.test(n)) || null;
  }
  return hit;
}

// A glob pattern that excludes every .env* name (for --exclude=... / rg -g '!...').
function coversEnv(glob) {
  return ENV_SAMPLE_NAMES.every((n) =>
    expandBraces(glob).some((alt) => {
      try {
        return segmentToRegex(alt.split('/').pop()).test(n);
      } catch {
        return false;
      }
    }),
  );
}

// Remove exclusion options so `--exclude='.env*'` doesn't count as mentioning .env.
const stripExcludes = (s) =>
  s.replace(/--exclude(?:-dir)?=\S+/gi, ' ').replace(/(^|\s)(?:-g|--glob|--iglob)(?:=|\s*)['"]?!\S*/gi, ' ');

// ---------- protected locations ----------

function protectedTargets(roots) {
  const files = []; // { rel, abs, forms, ino }
  const ancestors = new Map(); // normalised dir -> rel of a protected file inside it
  for (const root of roots) {
    for (const rel of WRITE_PROTECTED_REL) {
      const abs = resolve(root, rel);
      files.push({ rel, abs, forms: forms(abs), ino: inode(abs) });
      for (const start of new Set([abs, canonical(abs)])) {
        for (let d = dirname(start); ; d = dirname(d)) {
          if (!ancestors.has(norm(d))) ancestors.set(norm(d), rel);
          if (dirname(d) === d) break;
        }
      }
    }
  }
  return { files, ancestors, filePaths: [...new Set(files.flatMap((f) => f.forms))] };
}

// ---------- Bash ----------

const ENV_MENTION = /(?:^|[\s/=:@<>(`'"{,;|&$])(\.env[^\s;|&<>()'"`]*)/i;
const WRITE_NAME = /(?:^|[^a-z0-9_])(bookshelf\.db(?:-shm|-wal)?|seed\.sql)/i;
const REDIRECT_TARGET = /(?:>>?\|?|<>)\s*([^\s;&|<>()]+)/g;
const GIT_CLEAN_X = /\bgit\b[^|;&]*\bclean\b[^|;&]*\s-[a-zA-Z]*[xX]/;

const GREP_FAMILY = new Set(['grep', 'egrep', 'fgrep']);
const GREP_VALUE_FLAGS = new Set(['-e', '-f', '-A', '-B', '-C', '-m', '-d', '-D', '--regexp', '--file', '--include', '--exclude', '--exclude-dir', '--exclude-from', '--label', '--context', '--max-count', '--after-context', '--before-context', '--directories', '--devices']);
const RG_VALUE_FLAGS = new Set(['-e', '-f', '-g', '-t', '-T', '-A', '-B', '-C', '-m', '-j', '-M', '-E', '-r', '--glob', '--iglob', '--type', '--type-not', '--regexp', '--file', '--context', '--after-context', '--before-context', '--max-count', '--threads', '--max-columns', '--encoding', '--replace']);

// For a recursive grep/rg segment: { targets, excluded } or null when it doesn't recurse into hidden files.
function recursiveRead(seg) {
  const isGrep = GREP_FAMILY.has(seg.name);
  if (!isGrep && seg.name !== 'rg') return null;
  const words = seg.args.map((w) => w.text);
  const recursive = isGrep
    ? words.some((w) => /^-[a-zA-Z0-9]*[rR]/.test(w) || /^--(dereference-)?recursive$/.test(w) || /^--directories=recurse$/.test(w)) ||
      words.some((w, i) => w === '-d' && words[i + 1] === 'recurse')
    : words.some((w) => w === '--hidden' || w === '-.' || /^-[a-zA-Z.]*u/.test(w));
  if (!recursive) return null;

  const valueFlags = isGrep ? GREP_VALUE_FLAGS : RG_VALUE_FLAGS;
  const positional = [];
  let patternGiven = false;
  let excluded = false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === '--') {
      positional.push(...words.slice(i + 1));
      break;
    }
    let value = null;
    let flag = w;
    if (valueFlags.has(w)) value = words[++i] ?? '';
    else if (/^--[^=]+=/.test(w)) [flag, value] = [w.slice(0, w.indexOf('=')), w.slice(w.indexOf('=') + 1)];
    else if (!isGrep && /^-g./.test(w)) [flag, value] = ['-g', w.slice(2)];
    else if (/^-e./.test(w)) [flag, value] = ['-e', w.slice(2)];
    else if (w.startsWith('-')) continue;
    else {
      positional.push(w);
      continue;
    }
    if (['-e', '-f', '--regexp', '--file'].includes(flag)) patternGiven = true;
    if (isGrep && flag === '--exclude' && coversEnv(value)) excluded = true;
    if (!isGrep && ['-g', '--glob', '--iglob'].includes(flag) && value.startsWith('!') && coversEnv(value.slice(1))) excluded = true;
  }
  return { targets: patternGiven ? positional : positional.slice(1), excluded };
}

// Does an argument resolve to a directory that holds a write-protected file?
function hitsAncestor(cwd, text, prot) {
  if (hasGlobChars(text)) {
    if (cwd === null && !isAbsolute(text)) return text;
    const hit = pathGlobMatches(cwd ?? '/', text, [...prot.ancestors.keys()]);
    return hit ? prot.ancestors.get(hit) : null;
  }
  if (cwd === null && !isAbsolute(text) && !text.startsWith('~')) return text; // unknown cwd: be safe
  const abs = toAbs(cwd ?? '/', text);
  for (const f of forms(abs)) if (prot.ancestors.has(f)) return prot.ancestors.get(f);
  return null;
}

const DELETES_ALL = new Set(['rm', 'rmdir', 'unlink', 'shred', 'mv']);
const COPIES = new Set(['cp', 'rsync']);
const CHANGES_RECURSIVE = new Set(['chmod', 'chown', 'chgrp']);

function checkBash(command, input, prot) {
  const normalised = normalise(command);
  const dotglob = /\b(dotglob|GLOBIGNORE)\b/i.test(normalised);
  const segments = parseCommand(command, baseDirOf(input));

  // 2. any mention of a .env name (exclusion options don't count)
  const stripped = stripExcludes(command);
  const env = ENV_MENTION.exec(stripped) || ENV_MENTION.exec(stripExcludes(normalised));
  if (env) block(`the command mentions ${env[1]}: ${envReason(env[1])}`);

  // 4a. glob tokens that can match a .env name (split the original so we still know which were quoted)
  for (const raw of stripped.split(/[\s;|&<>()`=:]+/)) {
    if (!raw) continue;
    const tok = normalise(raw);
    if (!hasGlobChars(tok)) continue;
    const quoted = /['"\\]/.test(raw); // quoted globs go to the program (find, rg...), no dot rule
    if (globMatches(tok, quoted || dotglob).env) block(`the glob ${tok} can match a .env file: ${envReason('.env')}`);
  }

  // 1. git clean -x / -X
  if (GIT_CLEAN_X.test(normalised))
    block(`git clean -x/-X deletes ignored files, including bookshelf.db and any .env file; ${HINT}`);

  // 3. recursive reads that would include a .env file
  for (const seg of segments) {
    const rr = recursiveRead(seg);
    if (!rr || rr.excluded) continue;
    const targets = rr.targets.length ? rr.targets : ['.'];
    for (const t of targets) {
      let found = null;
      if (seg.cwd === null && !isAbsolute(t) && !t.startsWith('~')) found = `${t} (unknown directory after cd)`;
      else {
        let abs = toAbs(seg.cwd ?? '/', t);
        if (hasGlobChars(abs)) abs = abs.split('/').slice(0, abs.split('/').findIndex((s) => hasGlobChars(s))).join('/') || '/';
        const real = norm(canonical(abs));
        const root = rootsOf(input).map((r) => norm(canonical(r))).find((r) => isUnder(r, real));
        found = root ? `${t} (the project root or above it)` : findEnvFile(abs, isEnvName);
      }
      if (found)
        block(
          `${seg.name} reads recursively through ${t} and would include .env files (${found}). Search a narrower directory or add --exclude='.env*' (rg: -g '!.env*'). If a .env value must change, ${HINT}`,
        );
    }
  }

  // 2/4b. ancestor directories of write-protected files
  for (const seg of segments) {
    let targets = [];
    const pos = positionals(seg.args);
    const flags = seg.args.filter((a) => a.text.startsWith('-')).map((a) => a.text);
    if (DELETES_ALL.has(seg.name)) targets = pos;
    else if (COPIES.has(seg.name)) {
      const t = seg.args.findIndex((a) => a.text === '-t' || a.text === '--target-directory');
      const eq = seg.args.find((a) => a.text.startsWith('--target-directory='));
      if (t !== -1 && seg.args[t + 1]) targets = [seg.args[t + 1]];
      else if (eq) targets = [{ text: eq.text.split('=').slice(1).join('=') }];
      else targets = pos.slice(-1);
    } else if (CHANGES_RECURSIVE.has(seg.name) && flags.some((f) => /^-[a-zA-Z]*R/.test(f) || f === '--recursive')) targets = pos;
    for (const a of targets) {
      const rel = hitsAncestor(seg.cwd, a.text, prot);
      if (rel) block(`${seg.name} on ${a.text} would affect a directory that contains ${displayName(rel)}; ${HINT}`);
    }
  }

  // 3. write-protected names + write-like op
  for (const target of [...normalised.matchAll(REDIRECT_TARGET)].map((m) => m[1])) {
    const lit = WRITE_PROTECTED_NAMES.find((n) => n === basename(target).toLowerCase());
    if (lit) block(`the command redirects into ${lit}: ${writeReason(lit)}`);
  }
  const globWrite = [];
  for (const seg of segments) {
    for (const w of [...seg.words, ...seg.redirects]) {
      const isRedirect = seg.redirects.includes(w);
      for (const tok of subTokens(w.text)) {
        if (!hasGlobChars(tok)) continue;
        let name = null;
        if (tok.includes('/') && !(seg.cwd === null && !isAbsolute(tok))) {
          const hit = pathGlobMatches(seg.cwd ?? '/', tok, prot.filePaths);
          name = hit ? prot.files.find((f) => f.forms.includes(hit)).rel : null;
        } else name = globMatches(tok, true).write;
        if (!name) continue;
        if (isRedirect) block(`the command redirects into ${tok}: ${writeReason(basename(name))}`);
        globWrite.push({ tok, name: basename(name) });
      }
    }
  }

  const named = WRITE_NAME.exec(normalised);
  const writeLike = isWriteLike(normalised, segments);
  if (writeLike && named) block(`the command names ${named[1]} and has a write-like operation: ${writeReason(named[1])}`);
  if (writeLike && globWrite.length) {
    const { tok, name } = globWrite[0];
    block(`the glob ${tok} can match ${displayName(name)} and the command has a write-like operation: ${writeReason(name)}`);
  }
}

// ---------- main ----------

const input = await readInput();

failClosed(() => {
  const tool = input.tool_name;
  const ti = toolInput(input);
  const baseDir = baseDirOf(input);
  const prot = protectedTargets(rootsOf(input));

  const envName = (p) => {
    if (typeof p !== 'string' || p === '') return null;
    const abs = toAbs(baseDir, p);
    if (isEnvName(basename(abs))) return basename(abs);
    const real = canonical(abs);
    return isEnvName(basename(real)) ? basename(real) : null;
  };
  const writeProtected = (p) => {
    if (typeof p !== 'string' || p === '') return null;
    const abs = toAbs(baseDir, p);
    const fs = forms(abs);
    const ino = inode(abs);
    const f = prot.files.find((f) => f.forms.some((x) => fs.includes(x)) || (ino && f.ino === ino));
    return f ? f.rel : null;
  };
  const checkEnvPath = (p) => {
    const name = envName(p);
    if (name) block(envReason(name));
  };

  switch (tool) {
    case 'Edit':
    case 'Write':
    case 'MultiEdit':
    case 'NotebookEdit':
      for (const p of [ti.file_path, ti.notebook_path]) {
        checkEnvPath(p);
        const rel = writeProtected(p);
        if (rel) block(writeReason(rel));
      }
      break;
    case 'Read':
      checkEnvPath(ti.file_path);
      break;
    case 'Grep':
      checkEnvPath(ti.path);
      if (typeof ti.glob === 'string') {
        if (isEnvName(basename(ti.glob))) block(envReason(basename(ti.glob)));
        if (globMatches(ti.glob, true).env) block(`the Grep glob ${ti.glob} can match a .env file: ${envReason('.env')}`);
      }
      break;
    case 'Glob':
      checkEnvPath(ti.path);
      if (typeof ti.pattern === 'string') {
        if (isEnvName(basename(ti.pattern))) block(envReason(basename(ti.pattern)));
        if (globMatches(ti.pattern, false).env)
          block(`the Glob pattern ${ti.pattern} can match a .env file: ${envReason('.env')}`);
      }
      break;
    case 'Bash':
      if (typeof ti.command !== 'string') block('Bash call without a command string (fail closed).');
      checkBash(ti.command, input, prot);
      break;
  }
});
