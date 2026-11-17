---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/book-search/`.

Scout map:
TASK: Make `GET /books/search?q=` return matching books as an HTML card fragment for the home-page search box (`#search-results`), with a "No books found" message when nothing matches.
FILES:
- `src/routes/books.ts:12-23` — stub handler to replace; `q` read at line 13.
- `src/models/book.ts:22-28` — `searchBooks(query)` already exists; LIKE on title OR author, ORDER BY title.
- `src/views/books/index.ejs:19-31` — `#search-results` wrapper and `.book-card` markup to reuse in a fragment.
- `src/views/books/index.ejs:11-13` — `hx-get="/books/search"`, `hx-target="#search-results"`, `hx-trigger` on input.
- `src/db/seed.sql:26,36-37` — Dune (Frank Herbert), The Martian and Project Hail Mary (Andy Weir) seed rows.
- `src/views/books/reviews-list.ejs` — existing HTMX fragment pattern (root id matches target).
- `src/public/css/style.css:251` — `.search-message` class, already used by the stub.
- `tests/models/book.test.ts:61` — `// TODO: Add tests for searchBooks` (only search-related test hook).
REUSE: `Book.searchBooks()`; `Book.getAllBooks()` for empty `q`; `.book-grid` / `.book-card` markup from `books/index.ejs`; `.search-message` class; `res.render` of a fragment template (as `POST /books/:id/reviews` does at `routes/books.ts:55`).
TESTS: `tests/models/book.test.ts` (uses `/tmp/test-book-model.db`), `tests/routes/api.test.ts` (uses `/tmp/test-api.db`), `tests/db.test.ts` (uses `/tmp/test-bookshelf.db`), `tests/setup.ts` (unwired, same path as db.test.ts). No existing test covers `/books/search`.
RULES: 2 SQL via `all`/`get` with `?` placeholders (already true in `searchBooks`); 3 relative imports end in `.js`; 4 any new view file must be added to `copy-assets` and `files` in `package.json`; 5 HTMX endpoint returns HTML, never JSON; 6 tests use own tmp DB, never `./bookshelf.db`; 7 reuse existing CSS classes (`.book-card`, `.search-message`); 1 don't touch other homework gaps (JSON API search, user/review/shelf tests).
UNCLEAR: Whether the fragment should be a new template file (`books/search-results.ejs`, which rule 4 would require adding to copy-assets and `files`) or inline HTML in the route. Whether `q` should be trimmed. Empty-result copy beyond "No books found".
