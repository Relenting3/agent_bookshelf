---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/books-page/`.

Scout map:
TASK: Make the books page (`/`, the "Bookshelf" list) better; the task is vague and does not say what "better" means.
FILES:
- `src/views/books/index.ejs:1-33` — books page template: search input, `#search-results`, `.book-grid` of `.book-card`s; no cover, description, or rating shown.
- `src/routes/books.ts:6-9` — `GET /` calls `Book.getAllBooks()` and renders `books/index`.
- `src/routes/books.ts:11-22` — `GET /books/search` is the stubbed homework gap (Rule 1); the search input's `hx-get` targets it.
- `src/public/css/style.css:52-89` — `.book-grid`, `.book-card`, `.author`, `.year`.
- `src/public/css/style.css:222-251` — `.search-container`, `#search-input`, `.htmx-indicator`, `.search-message`.
- `src/models/book.ts:13-27` — `getAllBooks` (ordered by title), `getBookById`, `searchBooks` (exists, unused by routes).
- `src/views/partials/header.ejs`, `src/views/partials/footer.ejs` — page wrapper includes.
- `src/db/schema.sql` / `src/db/seed.sql` — books columns: `cover_url`, `description`, `published_year`, `isbn` (no ratings column; ratings come from `reviews`).

REUSE: `Review.getAverageRating(bookId)` in `src/models/review.ts` for ratings; `.book-grid`/`.book-card`/`.author`/`.year` classes; `.search-container`/`#search-input`/`.htmx-indicator` already styled; `.btn-primary`, `.form-group`, `.shelf-card` for new UI (Rule 7); `books/show.ejs` for detail patterns.

TESTS: `tests/models/book.test.ts` (getAllBooks: 50 books, first title "1984", lines 21-24; line 61 TODO for searchBooks); `tests/routes/api.test.ts` (JSON `/api/books` only); `tests/db.test.ts` (seed counts). Tmp DB paths already used: `/tmp/test-bookshelf.db` (db.test.ts and setup.ts); the paths in `book.test.ts` and `api.test.ts` were not checked. No test covers the `GET /` HTML route.

RULES: 1 — keep the `/books/search` stub and the search homework gap unless the task is that homework; 2 — SQL only via `all/get/run` with `?`; 3 — `.js` suffix on relative imports; 4 — new non-TS runtime files need `copy-assets` and `files` entries; 5 — HTML routes use `res.render`, HTMX fragments return HTML not JSON; 6 — don't touch `./bookshelf.db`, don't reuse tmp DB paths, update seed-count tests if seed changes; 7 — reuse existing CSS classes and palette (`#2c3e50`, `#3498db`, `#e74c3c`, `#ddd`, 4px/8px radii), don't restyle other pages.

UNCLEAR: "Better" is undefined. Open points for the planner: is the search wiring (Rule 1 gap) in scope; should cards show cover, description, or average rating; should sorting/filtering be added; may the `/books/search` stub change, or must the page stay as-is while only the layout changes.
