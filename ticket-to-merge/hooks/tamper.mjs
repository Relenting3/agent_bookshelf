#!/usr/bin/env node
// ticket-to-merge PostToolUse hook on Bash: tamper backstop for src/db/seed.sql.
//
// protect.mjs can't see writes whose target is built at run time (variables, command output,
// scripts, programs that write on their own). After every Bash call this checks git: if
// src/db/seed.sql is modified, deleted or staged, it is restored from HEAD
// (`git checkout HEAD -- src/db/seed.sql`) and exit 2 tells Claude what happened.
// Before restoring, the working copy (if any) is saved to <project>/.ttm/backups/ so a change
// made by hand is never lost for good.
//
// Covers seed.sql only: bookshelf.db is gitignored (nothing to restore from), and a .env read
// can't be undone after the fact. Exits 0 when the project isn't a git repo or seed.sql isn't
// tracked in HEAD. PostToolUse runs after the command, so this repairs, it doesn't prevent.
// Project dir = CLAUDE_PROJECT_DIR, fallback input.cwd.

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { projectDirFor, readJsonStdin } from './lib.mjs';

const FILE = 'src/db/seed.sql';

const input = await readJsonStdin();
const project = projectDirFor(input);

const git = (...args) => spawnSync('git', ['-C', project, ...args], { encoding: 'utf8', timeout: 10_000 });

if (git('rev-parse', '--is-inside-work-tree').stdout?.trim() !== 'true') process.exit(0);
if (!git('ls-tree', '--name-only', 'HEAD', '--', FILE).stdout?.trim()) process.exit(0);

const status = git('status', '--porcelain', '--', FILE);
if (status.status !== 0 || !status.stdout.trim()) process.exit(0);

const current = join(project, FILE);
let backup = '';
if (existsSync(current)) {
  try {
    const dir = join(project, '.ttm', 'backups');
    mkdirSync(dir, { recursive: true });
    backup = join(dir, `seed.sql.${new Date().toISOString().replace(/[:.]/g, '-')}`);
    copyFileSync(current, backup);
  } catch {
    backup = '';
  }
}

const restore = git('checkout', 'HEAD', '--', FILE);
if (restore.status !== 0) {
  process.stderr.write(
    `src/db/seed.sql was changed by that command and could NOT be restored (${(restore.stderr || '').trim().split('\n')[0]}). Never modify it; ask the human.\n`,
  );
  process.exit(2);
}

process.stderr.write('src/db/seed.sql was changed by that command and has been restored from HEAD. Never modify it; ask the human.\n');
process.exit(2);
