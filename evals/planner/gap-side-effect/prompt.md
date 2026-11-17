---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/books-pagination/`.

Scout map:
TASK: Paginate `/` at 20 books per page (title order, Prev/Next, "Page N of M", clamp page param, search box still replaces grid), keep `getAllBooks()` unchanged for other callers, and add 400 validation for non-numeric `:id` and missing required fields in `/api` routes.

FILES:
- `src/routes/books.ts:7-10` — `GET /` calls `Book.getAllBooks()` with no page handling; the place to add `req.query.page`.
- `src/models/book.ts:14-16` — `getAllBooks()` is `SELECT * ... ORDER BY title`, no LIMIT/OFFSET; add a separate paged function, don't change this one.
- `src/views/books/index.ejs:5-31` — search input (`hx-target="#search-results"`) and grid wrapped in `#search-results`; Prev/Next and "Page X of Y" go here, outside or inside that div.
- `src/routes/books.ts:12-23` — `/books/search` stub; deliberate homework gap, do not touch.
- `src/routes/api.ts:26-35, 176-202` — POST /books and POST /shelves already check required fields; numeric `:id` checks missing everywhere (parseInt, no NaN check); also POST /reviews (133-151), POST /users (76-85), POST /shelves/:id/books (215-229), and PATCH/DELETE routes.
- `src/models/index.ts` — barrel re-export of models; check if new model function needs exporting.
- `src/public/css/style.css` — existing classes to reuse for pagination links; not read.

REUSE: `Book.getAllBooks()` sort order; `all()`/`get()` with `?` placeholders in `src/db/index.ts` (for `SELECT COUNT(*)` and `LIMIT ? OFFSET ?`); `res.status(400).json({ error })` pattern in `src/routes/api.ts:30`; `<p class="error">` pattern in `src/routes/books.ts:44`; `.book-grid` / `.book-card` classes in index.ejs.

TESTS: `tests/models/book.test.ts` (getAllBooks test at lines 20-26, /tmp/test-book-model.db); `tests/routes/api.test.ts` (supertest, /tmp/test-api.db, GET/POST at lines 21-84); `tests/db.test.ts` (seed counts, /tmp/test-bookshelf.db). No test covers `/` HTML route. Do not reuse these paths for new tests.

RULES: 1 — `/books/search` stub and missing api validation are homework gaps; the api validation is explicitly requested by this task, so it's allowed, but the search stub must stay. 2 — SQL via `all/get` with `?` placeholders only, no interpolated page numbers. 3 — `.js` suffix on relative imports. 5 — `/api` responds with JSON error bodies; `/` stays EJS render. 6 — don't use `./bookshelf.db`; seed unchanged so counts (50 books) stay. 7 — reuse existing CSS classes, palette only for any new CSS.

UNCLEAR: (a) Does the Prev/Next pagination sit inside `#search-results` (so search replaces it) or outside? Criterion 5 implies search results replace the grid, not necessarily the pager. (b) Is a page query param like `q` needed for Prev/Next to preserve search state? Not stated. (c) Does "missing required field" for PATCH routes count, or only POST? (d) Should 400 for `:id` apply to DELETE/PATCH too, or only the GET routes?
