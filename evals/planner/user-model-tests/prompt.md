---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/user-model-tests/`.

Scout map:
TASK: Add tests for every exported function in `src/models/user.ts` (getAllUsers, getUserById, getUserByUsername, createUser, updateUser, deleteUser), using seed users, with a UNIQUE-username throw test. Only `models/user.ts` is in scope.

FILES:
- `src/models/user.ts:10` — `getAllUsers`, ordered by display_name (Alice, Bob, Carol)
- `src/models/user.ts:14` — `getUserById`, returns undefined when missing
- `src/models/user.ts:18` — `getUserByUsername`, seed usernames are alice, bob, carol
- `src/models/user.ts:22` — `createUser`, inserts then re-reads by lastInsertRowid
- `src/models/user.ts:27` — `updateUser`, returns undefined for missing id, returns existing when no fields given
- `src/models/user.ts:50` — `deleteUser`, returns boolean from `changes`
- `src/db/seed.sql:5` — seed users: alice/Alice Chen, bob/Bob Martinez, carol/Carol Okafor
- `src/db/schema.sql:12` — users table; username UNIQUE NOT NULL, the source of the duplicate-throw case
- `tests/models/book.test.ts:1` — model test pattern to copy (beforeEach/afterEach with its own tmp DB)

REUSE: `initDb`/`closeDb` from `src/db/index.js`; the `book.test.ts` setup pattern (import `* as X from '../../src/models/...js'`).

TESTS: `tests/models/book.test.ts` and `tests/db.test.ts` (asserts 3 users). Tmp paths already in use: `/tmp/test-bookshelf.db` (db.test.ts), `/tmp/test-book-model.db` (book.test.ts), `/tmp/test-api.db` (api.test.ts). `/tmp/test-user.db` appears only in `tests/README.md` (out of date), so it is not in use by a real test file. Use a new path such as `/tmp/test-user-model.db`.

RULES: 6 (never use `./bookshelf.db`; distinct tmp path per file, unlink in afterEach); 3 (relative imports end in `.js`); 1 (this is the explicit homework exception, so don't fill the other gaps); 2 (no SQL changes needed in tests).

UNCLEAR: none. Note for the planner: `book.test.ts` calls `require('fs')` inside an ESM file, which is a quirk, so use `import fs from 'fs'` or `node:fs` in the new file. The `updateUser` `username` field is also UNIQUE, so a duplicate-username update would throw, but task.md does not ask for that case.
