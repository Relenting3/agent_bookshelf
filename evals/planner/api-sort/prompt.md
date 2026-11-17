---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/api-books-sort/`.

Scout map:
TASK: Add optional `sort` query param to `GET /api/books` (`title` default, `year` = published_year asc, ties by title, NULL years last; unknown values fall back to title; HTML home unchanged).
FILES:
- `src/models/book.ts:14` — `getAllBooks()` hardcodes `ORDER BY title`; sort logic likely goes here or in route
- `src/routes/api.ts:10` — `GET /books` handler calls `Book.getAllBooks()` with no args; reads no query
- `src/routes/books.ts:7` — HTML home calls `Book.getAllBooks()`; must stay unchanged
- `src/routes/shelves.ts:35` — also calls `Book.getAllBooks()`; unaffected if default kept
- `tests/routes/api.test.ts:21` — `GET /api/books` supertest block; add sort cases here
- `tests/models/book.test.ts:20` — `getAllBooks` describe block; model-level sort tests possible
REUSE: `all()` with fixed ORDER BY string (no interpolation; pick literal clause in code, per Rule 2); existing `searchBooks` ORDER BY pattern at `src/models/book.ts:25`
TESTS: `tests/routes/api.test.ts`, `tests/models/book.test.ts`, `tests/db.test.ts`; tmp DBs in use: `/tmp/test-api.db`, `/tmp/test-book-model.db`, `/tmp/test-bookshelf.db` (setup.ts unwired, uses same path as db.test.ts)
RULES: 1 don't fill other homework gaps (api input validation stays out of scope); 2 SQL via `all` with fixed string only; 3 `.js` import suffixes; 5 `/api` returns JSON only; 6 never point tests at `./bookshelf.db`, use a distinct tmp path for any new test file
UNCLEAR: Where sort should live (model arg vs route-side sort); whether changing `getAllBooks` signature is acceptable given the shelves.ts and books.ts callers; NULL ordering in SQLite (NULLs sort first by default, so an explicit `IS NULL` ordering is needed for year).
