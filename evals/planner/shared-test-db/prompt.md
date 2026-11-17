---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/shelves-route-tests/`.

Scout map:
TASK: Add `tests/routes/shelves.test.ts` (supertest) covering the five `src/routes/shelves.ts` routes, including the 404s and add/remove fragment behaviour, using `/tmp/test-bookshelf.db`.

FILES:
- `src/routes/shelves.ts:13` — `GET /user/:userId`; 404 "User not found" at :17-18
- `src/routes/shelves.ts:27` — `GET /:id`; 404 "Shelf not found" at :31-32
- `src/routes/shelves.ts:8` — `GET /` renders `shelves/index` with all users
- `src/routes/shelves.ts:39` — `POST /:id/books`; 400 on missing bookId at :43-44; renders `books-list` at :50
- `src/routes/shelves.ts:53` — `DELETE /:id/books/:bookId`; renders `books-list` at :60
- `src/views/shelves/books-list.ejs:1` — fragment root is `div.shelf-books` with no id; empty-state text "This shelf is empty"; hx-target is `#shelf-books-list`
- `src/views/shelves/show.ejs:28` — `#shelf-books-list` wrapper lives here; add form at :10-13
- `src/models/shelf.ts:64` — `addBookToShelf` returns false if already on shelf (no error)
- `src/db/seed.sql:64-74` — shelves: user 1 has ids 1-3, user 2 has 4-6, user 3 has 7-9

REUSE: supertest + `app` default import from `src/server.js` (as in `tests/routes/api.test.ts:3`); `initDb`/`closeDb` from `src/db/index.js`; `afterEach` unlink pattern (`tests/routes/api.test.ts:10-18`).

TESTS: `tests/db.test.ts` (uses `/tmp/test-bookshelf.db`, the same path this task requires; its afterEach unlinks it, so running both files in parallel will clash); `tests/models/book.test.ts`; `tests/routes/api.test.ts` (uses `/tmp/test-api.db`). Tmp DB paths already in use: `/tmp/test-bookshelf.db`, `/tmp/test-api.db`.

RULES: 1 (don't fix the books-list id bug or fill gaps); 3 (`.js` import suffix); 5 (HTML fragments, not JSON, from HTMX routes); 6 (never point at `./bookshelf.db`; don't reuse another file's tmp path, which this task does by design); 2 (no request values in SQL).

UNCLEAR: The task asks for `/tmp/test-bookshelf.db`, which `tests/db.test.ts` already uses. Vitest runs files in parallel, so the two files will race on that file and may break `npm run test:run`. Rule 6 forbids sharing a path. Planner should confirm whether to use the shared path anyway or pick a different one. Also, the task's "removing returns the list without it" needs a book id that is on a known shelf. Seed data for shelf_books was not checked, so the planner should confirm which book ids are on which shelves.
