---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/api-user-lookup/`.

Scout map:
TASK: Add `GET /api/users?username=<name>` returning the matching user (case-insensitive lookup), 404 `{error:"User not found"}` on miss, and unchanged list behaviour without the param.

FILES:
- `src/routes/api.ts:60` — `GET /users` list handler; add `username` query branch here.
- `src/routes/api.ts:65` — `GET /users/:id` handler; the 404 JSON pattern to copy.
- `src/models/user.ts:18` — `getUserByUsername`, exact `WHERE username = ?` (case-sensitive in SQLite).
- `src/models/user.ts:10` — `getAllUsers`, used by the list branch.
- `src/db/schema.sql:14` — `username TEXT UNIQUE NOT NULL`, no COLLATE NOCASE.
- `src/db/seed.sql:5-7` — seeded usernames are lowercase: alice, bob, carol.
- `tests/routes/api.test.ts:7` — route tests; tmp DB `/tmp/test-api.db`, no `/api/users` tests found.

REUSE: `User.getUserByUsername` (exists, unused by routes); the 404 pattern at `api.ts:69-71`.

TESTS: `tests/routes/api.test.ts` (supertest, `/tmp/test-api.db`); `tests/models/book.test.ts` (`/tmp/test-book-model.db`); `tests/db.test.ts` (`/tmp/test-bookshelf.db`). No user model or user route tests exist. Do not reuse these paths.

RULES: 1 (user model and api validation are homework gaps, don't fill unrelated); 2 (SQL via `get`/`all` with `?`); 3 (`.js` relative imports); 5 (`/api` returns `res.json` and JSON errors); 6 (tmp DB paths, distinct per file).

UNCLEAR: AC2 and AC4 conflict. AC2 says `?username=Alice` must return Alice (case-insensitive), while AC4 says `?username=Alice` must not match `alice` (exact). Both cannot hold with `getUserByUsername` as written. The planner must ask which wins. Also unclear whether the case-insensitive match should use `LOWER(username) = LOWER(?)` in the model or in the route.
