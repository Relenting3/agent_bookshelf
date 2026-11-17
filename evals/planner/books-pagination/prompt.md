---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/books-pagination/`.

Scout map:
TASK: Show 20 books per page on `/` sorted by title, with Previous/Next links and a "Page N of M" label. Invalid or out-of-range pages are clamped. Search and `getAllBooks()` keep working as they do now.

FILES:
- `src/routes/books.ts:7` — `GET /` calls `getAllBooks()` and renders all books; the page-handling site.
- `src/views/books/index.ejs:19-31` — `#search-results` wrapper and `.book-grid` loop; search swaps this wrapper, so pagination controls must sit outside it or stay consistent with it.
- `src/views/books/index.ejs:11-13` — search input with `hx-get="/books/search"` and `hx-target="#search-results"`.
- `src/models/book.ts:14-16` — `getAllBooks()` with `ORDER BY title`; must keep its behaviour.
- `src/routes/books.ts:12-23` — `/books/search` stub returns an HTML fragment; not paginated, out of scope.
- `src/routes/api.ts:11` — other `getAllBooks()` caller; must stay unpaginated.
- `src/routes/shelves.ts:35` — other `getAllBooks()` caller; must stay unpaginated.
- `src/public/css/style.css:52,59,191,222` — `.book-grid`, `.book-card`, `.btn-primary`, `.search-container`; reuse for controls.

REUSE: `getAllBooks()` as the unpaginated base; `.btn-primary` for link buttons (no existing link-style class found); `.book-grid` and `.book-card`; `Book.searchBooks()` untouched; `res.render('books/index', ...)`. No existing pagination helper or `.pagination` CSS class exists.

TESTS: `tests/models/book.test.ts:20-22` (`getAllBooks` describe, must stay green); `tests/routes/api.test.ts` (API route tests, unaffected); `tests/db.test.ts` (seed counts: 50 books). No route test for `GET /` exists. I did not verify the tmp DB paths each test file uses; check its `initDb` call before picking a new path. `tests/db.test.ts` is known to use `/tmp/test-bookshelf.db`.

RULES: 1 — don't implement the `/books/search` stub or fill other homework gaps; 2 — any new SQL uses `?` placeholders (LIMIT/OFFSET via `?` or computed in code); 3 — relative imports end in `.js`; 5 — `/` stays `res.render`, search stays an HTML fragment; 6 — no `./bookshelf.db` in tests, unique tmp path; 7 — reuse existing CSS classes, palette only for any new CSS.

UNCLEAR: (a) Should pagination controls stay visible while search results are shown, or hide during search? (b) Should the "Page N of M" label appear when there is only one page or zero books? (c) What link style should Previous/Next use, since no existing pagination class exists?
