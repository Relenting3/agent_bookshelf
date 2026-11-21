// Shared helpers for the ticket-to-merge PreToolUse hooks (protect.mjs, guard-roles.mjs):
// stdin parsing (fail closed), command normalisation, a small shell lexer with `cd` tracking,
// write-like op detection, glob matching and path resolution.

import { readdirSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';

export const caseInsensitive = process.platform === 'darwin' || process.platform === 'win32';
export const norm = (p) => (caseInsensitive ? p.toLowerCase() : p);

export function block(reason) {
  process.stderr.write(`Blocked by ticket-to-merge: ${reason}\n`);
  process.exit(2);
}

// The hook's stdin JSON as an object, or null if it isn't one.
export async function readJsonStdin() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    const input = JSON.parse(raw);
    return input && typeof input === 'object' ? input : null;
  } catch {
    return null;
  }
}

// Parse the hook's stdin JSON. Unparseable input blocks (fail closed).
export async function readInput() {
  const input = await readJsonStdin();
  if (!input) block('could not parse the hook input (fail closed). If this keeps happening, ask the human to check the plugin hook by hand.');
  return input;
}

// Project dir for Stop/PostToolUse hooks: CLAUDE_PROJECT_DIR, fallback input.cwd.
export const projectDirFor = (input) => process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();

// Wrap a hook body so an unexpected exception blocks instead of allowing.
export function failClosed(fn) {
  try {
    fn();
  } catch (err) {
    block(`internal error in the hook (fail closed): ${String(err && err.message).split('\n')[0]}`);
  }
  process.exit(0);
}

export const toolInput = (input) => (input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {});
export const projectDirOf = (input) => process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
export const baseDirOf = (input) => input.cwd || projectDirOf(input);
export const rootsOf = (input) => [...new Set([projectDirOf(input), baseDirOf(input)])];

// ---------- paths ----------

export const expandHome = (p) => p.replace(/^~(?=$|\/)/, homedir());
export const toAbs = (baseDir, p) => resolve(baseDir, expandHome(p));

// realpath; for a path that doesn't exist (yet), realpath the deepest existing ancestor.
export function canonical(abs) {
  try {
    return realpathSync(abs);
  } catch {
    const rest = [];
    let dir = abs;
    for (;;) {
      const parent = dirname(dir);
      rest.unshift(basename(dir));
      if (parent === dir) return abs;
      dir = parent;
      try {
        return join(realpathSync(dir), ...rest);
      } catch {
        /* keep walking up */
      }
    }
  }
}

export function inode(p) {
  try {
    const s = statSync(p);
    return `${s.dev}:${s.ino}`;
  } catch {
    return null;
  }
}

// Both spellings of a path (as given and realpath'd), normalised for comparison.
export const forms = (abs) => [...new Set([norm(abs), norm(canonical(abs))])];

// a is b, or a is inside b
export function isUnder(a, b) {
  if (a === b) return true;
  return b === sep ? a.startsWith(sep) : a.startsWith(b + sep);
}

// ---------- globs ----------

// Expand {a,b} alternatives (bash brace expansion; also used by Glob/Grep globs). Capped.
export function expandBraces(s, out = [], limit = 128) {
  if (out.length >= limit) return out;
  const open = s.indexOf('{');
  if (open !== -1) {
    let depth = 0;
    const commas = [];
    for (let i = open; i < s.length; i++) {
      const c = s[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          if (commas.length) {
            const parts = [];
            let start = open + 1;
            for (const k of [...commas, i]) {
              parts.push(s.slice(start, k));
              start = k + 1;
            }
            for (const p of parts) expandBraces(s.slice(0, open) + p + s.slice(i + 1), out, limit);
            return out;
          }
          break;
        }
      } else if (c === ',' && depth === 1) commas.push(i);
    }
  }
  out.push(s);
  return out;
}

export const hasGlobChars = (s) => /[*?[]/.test(s) || /\{[^}]*,[^}]*\}/.test(s);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Regex source for one path segment. In path mode * and ? don't cross '/'.
function segmentSource(seg, pathMode) {
  let re = '';
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (c === '*') re += pathMode ? '[^/]*' : '.*';
    else if (c === '?') re += pathMode ? '[^/]' : '.';
    else if (c === '[') {
      let j = i + 1;
      if (seg[j] === '!' || seg[j] === '^') j++;
      if (seg[j] === ']') j++;
      while (j < seg.length && seg[j] !== ']') j++;
      if (j < seg.length) {
        let body = seg.slice(i + 1, j).replace(/\\/g, '\\\\');
        if (body[0] === '!') body = '^' + body.slice(1);
        re += `[${body}]`;
        i = j;
      } else re += '\\[';
    } else re += escapeRe(c);
  }
  return re;
}

export const segmentToRegex = (seg) => new RegExp(`^${segmentSource(seg, false)}$`, 'i');

// Does a glob that contains '/' (resolved against cwd) match one of the absolute paths?
// The literal directory prefix is also tried realpath'd, so a symlinked directory still matches.
export function pathGlobMatches(cwd, glob, absPaths) {
  for (const alt of expandBraces(glob)) {
    const abs = toAbs(cwd, alt);
    const segs = abs.split('/');
    const first = segs.findIndex((s) => /[*?[]/.test(s));
    if (first === -1) continue;
    const prefix = segs.slice(0, first).join('/') || '/';
    const rest = segs.slice(first).map((s) => (s === '**' ? '.*' : segmentSource(s, true))).join('/');
    for (const p of new Set([prefix, canonical(prefix)])) {
      let re;
      try {
        re = new RegExp(`^${escapeRe(p.replace(/\/$/, ''))}/${rest}$`, 'i');
      } catch {
        continue;
      }
      const hit = absPaths.find((a) => re.test(a));
      if (hit) return hit;
    }
  }
  return null;
}

// ---------- Bash ----------

// Remove ' " and \, decode \xNN \uNNNN \NNN escapes, drop the $ of $'...' quoting.
export function normalise(s) {
  return s
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
    .replace(/\$(?=['"])/g, '')
    .replace(/['"\\]/g, '');
}

// Simple shell assignments: NAME=value (also export/local/declare/readonly/typeset NAME=value).
// Later $NAME / ${NAME} are replaced with the value, in order, so chains (A=x; B=$A.sql) resolve.
// Values that contain $ or a backtick (command output, other variables not yet known) are left
// alone: their references stay unresolved and protect.mjs treats them as runtime-built targets.
const ASSIGN =
  /(^|[\s;&|('"`])((?:export|local|declare|readonly|typeset)(?:\s+-\w+)*\s+)?([A-Za-z_]\w*)=('[^']*'|"(?:[^"\\]|\\.)*"|[^\s;&|()<>'"`]*)/g;

export function substituteVars(command) {
  let out = command;
  let from = 0;
  for (let n = 0; n < 200; n++) {
    ASSIGN.lastIndex = from;
    const m = ASSIGN.exec(out);
    if (!m) break;
    const end = m.index + m[0].length;
    const name = m[3];
    const value = m[4].replace(/^(['"])([\s\S]*)\1$/, '$2');
    if (!/[$`]/.test(value)) {
      const ref = new RegExp(`\\$\\{${name}\\}|\\$${name}(?![A-Za-z0-9_])`, 'g');
      out = out.slice(0, end) + out.slice(end).replace(ref, () => value);
    }
    from = end;
  }
  return out;
}

// String concatenation in one-liners: 'a' + 'b', "a" + "b" (any spacing, mixed quote kinds,
// \"-escaped quotes inside a double-quoted shell string) and Python adjacent literals 'a' 'b'
// all collapse to 'ab'. Adjacent literals are also separate shell words, so callers check this
// as an extra variant of the command, never instead of the original.
const CONCAT = /\\?(['"])([^'"\n\\]*)\\?\1(?:\s*\+\s*|[ \t]+)\\?(['"])([^'"\n\\]*)\\?\3/;

export function collapseConcat(s) {
  for (let n = 0; n < 200; n++) {
    const next = s.replace(CONCAT, (_, q, a, _q2, b) => `${q}${a}${b}${q}`);
    if (next === s) break;
    s = next;
  }
  return s;
}

// The command variants a Bash check should look at (blocking on any of them).
export function commandVariants(command) {
  const subst = substituteVars(command);
  return [...new Set([subst, collapseConcat(subst)])];
}

// Sub-tokens of a word (splits nested commands like bash -c '...' and --opt=value).
export const subTokens = (text) => text.split(/[\s;|&<>()`=:]+/).filter(Boolean);

// Write-like ops (week 1's writeLike regex, extended). Tested on normalised text.
// `install` is handled separately: it only counts as the command name (see isWriteLike).
export const WRITE_OPS = [
  /\b(sed|perl|ruby)\b[^|;&]*\s(-[a-z]*i|--in-place)/i,
  /\b(g?awk)\b[^|;&]*-i\s*inplace/i,
  /\b(tee|rm|mv|cp|truncate|dd|ln|chmod|chown|touch|unlink|patch|rsync|shred)\b/i,
  /\b(vi|vim|nvim|nano|emacs|ed|ex)\b/i,
  /\bgit\b[^|;&]*\b(checkout|restore|rm|mv|apply|am|stash)\b/i,
  /\bsqlite3?\b/i,
  // interpreter one-liners / heredocs (node -e, python -c, perl -e, ruby -e) with a write call
  /\b(writeFile|appendFile|createWriteStream|copyFile|cpSync|renameSync|unlinkSync|rmSync|truncateSync|symlinkSync|linkSync|write_text|write_bytes|file_put_contents|File\.write|IO\.write|os\.(remove|unlink|rename|replace)|shutil\.\w+)/i,
  /\bopen(Sync)?\s*\([^)]*,\s*[wax]/i,
  /\bopen(Sync)?\s*\([^)]*\+/i,
];

export const isWriteLike = (text, segments) =>
  WRITE_OPS.some((re) => re.test(text)) || segments.some((s) => s.name === 'install');

const OPS = ['&>>', '&>', '>>', '>|', '>&', '<>', '<<<', '<<', '<&', '&&', '||', '>', '<', '|', '&', ';', '(', ')', '`', '\n'];
const SEPARATORS = new Set(['&&', '||', '|', '&', ';', '(', ')', '`', '\n']);
const FILE_REDIRECTS = new Set(['>', '>>', '>|', '&>', '&>>', '<>']);
const WRAPPERS = new Set(['sudo', 'doas', 'env', 'command', 'builtin', 'exec', 'nohup', 'time', 'nice', 'xargs', 'stdbuf', 'timeout']);

function lex(cmd) {
  const toks = [];
  let raw = '';
  const flush = () => {
    if (raw) toks.push({ type: 'word', raw });
    raw = '';
  };
  let i = 0;
  while (i < cmd.length) {
    const c = cmd[i];
    if (c === "'") {
      const j = cmd.indexOf("'", i + 1);
      const end = j === -1 ? cmd.length : j + 1;
      raw += cmd.slice(i, end);
      i = end;
    } else if (c === '"') {
      let j = i + 1;
      while (j < cmd.length && cmd[j] !== '"') j += cmd[j] === '\\' ? 2 : 1;
      const end = Math.min(j + 1, cmd.length);
      raw += cmd.slice(i, end);
      i = end;
    } else if (c === '\\') {
      raw += cmd.slice(i, i + 2);
      i += 2;
    } else if (c === ' ' || c === '\t' || c === '\r') {
      flush();
      i++;
    } else if (c === '#' && raw === '') {
      const j = cmd.indexOf('\n', i);
      i = j === -1 ? cmd.length : j;
    } else if (c === '$' && cmd[i + 1] === '(') {
      flush();
      toks.push({ type: 'op', op: '(' });
      i += 2;
    } else {
      const op = OPS.find((o) => cmd.startsWith(o, i));
      if (op) {
        flush();
        toks.push({ type: 'op', op });
        i += op.length;
      } else {
        raw += c;
        i++;
      }
    }
  }
  flush();
  return toks;
}

// Split a command into simple commands. Each segment: { words, name, args, redirects, cwd, text }.
// words/args/redirects are { raw, text (normalised), quoted }. cwd follows `cd` (null when unknown).
export function parseCommand(command, startCwd) {
  const segs = [];
  let cur = { words: [], redirects: [] };
  const toks = lex(command);
  const word = (raw) => ({ raw, text: normalise(raw), quoted: /['"\\]/.test(raw) });
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.type === 'word') cur.words.push(word(t.raw));
    else if (SEPARATORS.has(t.op)) {
      segs.push(cur);
      cur = { words: [], redirects: [] };
    } else if (toks[k + 1]?.type === 'word') {
      // redirect: the next word is its target (fd duplications like 2>&1 aren't files)
      const target = word(toks[++k].raw);
      if (FILE_REDIRECTS.has(t.op) || (t.op === '>&' && !/^(\d+|-)$/.test(target.text))) cur.redirects.push(target);
    }
  }
  segs.push(cur);

  let cwd = startCwd;
  const out = [];
  for (const s of segs) {
    if (!s.words.length && !s.redirects.length) continue;
    s.cwd = cwd;
    let i = 0;
    let afterWrapper = false;
    while (i < s.words.length) {
      const w = s.words[i].text;
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) i++;
      else if (afterWrapper && (/^-/.test(w) || /^\d+[smhd]?$/.test(w))) i++;
      else if (WRAPPERS.has(basename(w))) {
        afterWrapper = true;
        i++;
      } else break;
    }
    s.name = i < s.words.length ? basename(s.words[i].text) : '';
    s.args = s.words.slice(i + 1);
    s.text = [...s.words, ...s.redirects].map((w) => w.text).join(' ');
    if (s.name === 'cd' || s.name === 'pushd') {
      const a = s.args.find((w) => !w.text.startsWith('-'));
      if (!a) cwd = homedir();
      else if (/[$`*?[]/.test(a.text) || a.text === '-') cwd = null;
      else {
        const p = expandHome(a.text);
        cwd = isAbsolute(p) ? resolve(p) : cwd === null ? null : resolve(cwd, p);
      }
    }
    out.push(s);
  }
  return out;
}

// Positional (non-flag) args; everything after `--` is positional.
export function positionals(args) {
  const out = [];
  let rest = false;
  for (const a of args) {
    if (rest) out.push(a);
    else if (a.text === '--') rest = true;
    else if (!a.text.startsWith('-')) out.push(a);
  }
  return out;
}

// Does a directory contain a .env* file (not following node_modules/.git)? Returns the path,
// a 'too large' marker, or null. A plain file returns itself if it is a .env file.
export function findEnvFile(abs, isEnvName, cap = 5000) {
  let st;
  try {
    st = statSync(abs);
  } catch {
    return null;
  }
  if (!st.isDirectory()) return isEnvName(basename(abs)) ? abs : null;
  const stack = [abs];
  let n = 0;
  while (stack.length) {
    const d = stack.pop();
    if (++n > cap) return `${abs} (too many directories to check)`;
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (isEnvName(e.name)) return join(d, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') stack.push(join(d, e.name));
    }
  }
  return null;
}

// All files under a directory (for globs that might reach into it). Capped.
export function listTree(abs, cap = 5000) {
  const out = [abs];
  const stack = [abs];
  while (stack.length && out.length < cap) {
    const d = stack.pop();
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      out.push(p);
      if (e.isDirectory()) stack.push(p);
    }
  }
  return out;
}
