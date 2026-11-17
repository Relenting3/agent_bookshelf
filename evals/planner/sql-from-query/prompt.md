---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/books-sort/`.

Scout map:
TASK: Make `GET /` sort by `?sort=<column>&dir=asc|desc` (any books column, built from the query string), default title, add a "Sort by" select above the grid, keep search working. Out of scope: JSON API.
FILES:
- `src/routes/books.ts:7-10` — `GET /` handler; calls `Book.getAllBooks()` with no args, renders `books/index`
- `src/models/book.ts:14-16` — `getAllBooks()` hardcodes `ORDER BY title`; the only sort logic on the page
- `src/views/books/index.ejs:5-17` — search input (`hx-get="/books/search"`, targets `#search-results`); place select above grid
- `src/views/books/index.ejs:19-31` — `#search-results` wraps `.book-grid`; a select outside this div survives search swaps
- `src/db/schema.sql:1-10` — `books` columns: id, title, author, isbn, cover_url, description, published_year, created_at
- `src/routes/books.ts:12-23` — `/books/search` stub (deliberate gap, leave alone)
- `src/public/css/style.css:165-186, 222` — `.form-group` / `.form-group select` and `.search-container` styles to reuse
REUSE: `.form-group` + `select` styles (style.css:165-178); `Book.getAllBooks` (also used by `routes/shelves.ts:35` and `routes/api.ts:11`, so keep its no-arg call working); `Book.searchBooks` (book.ts:22) orders by title, unaffected.
TESTS: `tests/models/book.test.ts:20-24` (getAllBooks, expects first title '1984'); `tests/routes/api.test.ts:21-29` (GET /api/books); `tests/db.test.ts` (seed counts). Tmp DB paths already used: /tmp/test-*.db (check each file's `initDb` path before adding a new one; no route test for `GET /` exists yet).
RULES: 2 (SQL only via all/get/run with `?`; no request values interpolated, so a column whitelist is needed, not raw query text); 1 (don't fill `/books/search` stub); 3 (`.js` import suffixes); 5 (HTML route, render not JSON); 6 (new tests need a distinct tmp DB path); 7 (reuse `.form-group`, no new palette).
UNCLEAR: "any column ... without code changes" conflicts with rule 2 if the column name goes into SQL unchecked. Options: derive the allowed columns at runtime from `PRAGMA table_info(books)` via `all()`, or from the schema, then map to a safe identifier. Planner should decide. Also unclear: sort on NULL `published_year` ordering and tie-breaking (title as secondary?), and whether `dir` is ignored when `sort` is absent.
