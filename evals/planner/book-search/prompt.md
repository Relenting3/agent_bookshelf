---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/book-search/`.

Scout map:
TASK: Replace the stubbed `GET /books/search?q=` with an HTML fragment of matching book cards (title/author match, empty q shows all, "No books found" on no match). Homework gap #1, explicitly allowed.
FILES:
- `src/routes/books.ts:12` — stub handler to replace; returns inline `.search-message` div via `res.send`
- `src/models/book.ts:22` — `searchBooks(query)` already exists (LIKE on title/author, ORDER BY title); empty q gives `%%` so matches all
- `src/views/books/index.ejs:19` — `#search-results` target; card markup at lines 20–30 to reuse
- `src/views/books/reviews-list.ejs` — existing fragment pattern (root id matches hx-target), for a new fragment partial
- `src/public/css/style.css:52` — `.book-grid`; `:59` `.book-card`; `:251` `.search-message` (reuse for "No books found")
- `src/models/book.ts:14` — `getAllBooks()` for empty-q path
- `tests/models/book.test.ts:6` — model test file; tmp DB `/tmp/test-book-model.db`
- `tests/routes/api.test.ts:7` — route test pattern (supertest); tmp DB `/tmp/test-api.db`
REUSE: `Book.searchBooks`, `Book.getAllBooks`, `res.render` fragment pattern (as in `POST /books/:id/reviews`, routes/books.ts:55), `.book-grid`/`.book-card`/`.search-message` CSS
TESTS: `tests/models/book.test.ts`, `tests/routes/api.test.ts`, `tests/db.test.ts`; tmp DBs already used: `/tmp/test-book-model.db`, `/tmp/test-api.db`, `/tmp/test-bookshelf.db` (setup.ts also points here, unwired); no route test exists for `/books/search`
RULES: 1 (search is the allowed exception; don't fill other gaps), 2 (SQL via `?` placeholders only, already in model), 3 (`.js` import suffix), 5 (HTML fragment for HTMX, never JSON), 6 (no `./bookshelf.db`; unique tmp path), 7 (reuse existing card classes, no new CSS unless needed)
UNCLEAR: Whether to add a new fragment partial (e.g. `books/search-results.ejs`) or inline the markup; whether "No books found" uses `.search-message` or a new class; whether to add a route test (none exists) and which tmp DB path to use for it; `req.query.q` may be an array or undefined, so the planner should decide how to coerce it.
