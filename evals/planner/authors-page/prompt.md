---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/authors-page/`.

Scout map:
TASK: Add `GET /authors` (distinct authors with book counts) and `GET /authors/:name` (author's books by title, 404 if none), in a new `src/routes/authors.ts` mounted at `/authors`, plus an "Authors" nav link.

FILES:
- `src/models/book.ts:14` — home of new author queries (alongside `getAllBooks`, `searchBooks`); no author functions yet.
- `src/routes/authors.ts` — does not exist yet; new router file.
- `src/server.ts:5-8, 28-31` — router imports and `app.use` mounts; add `/authors` here.
- `src/views/partials/header.ejs:11-14` — nav; "Authors" link goes after Shelves (line 13).
- `src/views/books/index.ejs:19-30` — home page book-grid/book-card markup to reuse for author books.
- `src/routes/books.ts:29-31` — 404 pattern: `res.status(404).render('error', { message })`.
- `src/views/error.ejs` — normal error page for the 404 case.
- `src/public/css/style.css:52-85` — `.book-grid`, `.book-card`, `.author`, `.year`; `:267` `.shelf-card` for card style.
- `src/db/seed.sql:36-42` — Andy Weir (The Martian, Project Hail Mary) and J.R.R. Tolkien (names with dots).

REUSE: `all()`/`get()` from `src/db/index.ts` with `?` placeholders; `res.render` + `error` template for 404; `books/index.ejs` card markup; `.book-grid`/`.book-card` CSS; `res.locals.currentPath` (set in server.ts:24, not used by header yet).

TESTS: `tests/models/book.test.ts` (uses `/tmp/test-book-model.db`), `tests/routes/api.test.ts` (uses `/tmp/test-api.db`), `tests/db.test.ts` (uses `/tmp/test-bookshelf.db`). `tests/setup.ts` is unwired and uses `/tmp/test-bookshelf.db`. No route test exists for HTML pages yet, so a new test file needs a fresh `/tmp/test-<name>.db`.

RULES:
- 1: don't touch the search stub at `books.ts:12`, or the review/user/shelf model test gaps.
- 2: SQL via `all`/`get` with `?`; the `author` value is user-supplied via URL, so it must be bound, never interpolated.
- 3: relative imports end in `.js` (e.g. `'../models/book.js'`).
- 5: HTML routes use `res.render`; no JSON from these pages. Out of scope: JSON endpoints.
- 6: tests must not point at `./bookshelf.db`; use a distinct `/tmp/test-*.db`.
- 7: reuse existing card and grid classes; no restyling of existing pages.
- 4: no new runtime non-TS files expected; new views under `src/views/` are covered by the existing `copy-assets` step. Check package.json `files`/copy script only if a new non-view asset is added.

UNCLEAR:
- Route param encoding: Express decodes `req.params.name`, so "J.R.R. Tolkien" and "&" need `encodeURIComponent` in the links, which the task does not specify.
- Whether the author heading and "Authors" index should use new views (e.g. `src/views/authors/index.ejs`, `show.ejs`) or reuse existing ones. The task does not say.
- Whether the nav should highlight the active link (`currentPath` is set but unused).
- Whether the author page should change the `<title>` (header hardcodes "Agent Bookshelf").
