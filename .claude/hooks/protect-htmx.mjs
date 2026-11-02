#!/usr/bin/env node
// PreToolUse hook: blocks agents from modifying the vendored src/public/htmx.min.js.
// Exit code 2 blocks the tool call and sends stderr back to the agent as the reason.

import { resolve, relative, sep } from 'node:path';

const PROTECTED = 'src/public/htmx.min.js';
const REASON =
  `Blocked: ${PROTECTED} is a vendored third-party library and must not be edited. ` +
  'To change HTMX behavior, add code elsewhere (e.g. a separate script or hx-* attributes in views). ' +
  'To upgrade HTMX, ask the user to replace the file manually.';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0); // Malformed input: don't block.
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const caseInsensitive = process.platform === 'darwin' || process.platform === 'win32';
const norm = (p) => (caseInsensitive ? p.toLowerCase() : p);
const protectedAbs = norm(resolve(projectDir, PROTECTED));

function isProtectedPath(p) {
  if (typeof p !== 'string' || p === '') return false;
  return norm(resolve(input.cwd || projectDir, p)) === protectedAbs;
}

function block() {
  process.stderr.write(REASON + '\n');
  process.exit(2);
}

const tool = input.tool_name;
const ti = input.tool_input || {};

if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  if (isProtectedPath(ti.file_path) || isProtectedPath(ti.notebook_path)) block();
}

if (tool === 'Bash' && typeof ti.command === 'string') {
  const cmd = ti.command;
  // Heuristic: the command names the file AND contains a write-like operation.
  // Read-only commands (cat, grep, head, wc, ...) on the file are still allowed.
  if (/htmx\.min\.js/i.test(cmd)) {
    const writeLike =
      /(^|[^0-9&])>{1,2}\s*[^&\s]*htmx\.min\.js|\b(sed|perl|ruby)\b[^|;&]*\s-[a-z]*i|\b(tee|rm|mv|cp|truncate|dd|ln|chmod|install|unlink)\b|\bgit\s+(checkout|restore|rm|mv|apply)\b|\b(writeFile|appendFile|open\([^)]*['"]w)/i;
    if (writeLike.test(cmd)) block();
  }
}

process.exit(0);
