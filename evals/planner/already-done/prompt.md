---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/book-detail-page/`.

Scout map:
TASK: Add a book detail page at GET /books/:id (title, author, year, ISBN, description, average rating, reviews, add-review form), link home cards to it, 404 with error page for missing id.
FILES:
- `src/routes/books.ts:25` — GET /books/:id handler; 404 via error.ejs, renders books/show with averageRating
- `src/routes/books.ts:39` — POST /books/:id/reviews; HTMX, returns reviews-list fragment or <p class="error">
- `src/views/books/show.ejs:1` — detail page already built: info, rating, reviews, add-review form (hx-target #reviews-list)
- `src/views/books/index.ejs:23` — home cards already link to /books/:id
- `src/views/books/reviews-list.ejs:1` — HTMX fragment, root is the list content (no #reviews-list wrapper here; show.ejs:32 has it)
- `src/models/book.ts:18` — getBookById
- `src/models/review.ts:19` — getReviewsByBookId; :94 getAverageRating
- `src/views/error.ejs` — 404 error page (not inspected in detail)
- `src/public/css/style.css:91` — .book-detail; :105 .rating-summary; :158 .add-review
- `src/routes/books.ts:12` — /books/search stub (gap, Rule 1; do not touch)
REUSE: Book.getBookById, Review.getReviewsByBookId, Review.getAverageRating, error.ejs for 404, books/reviews-list.ejs fragment, existing .book-detail/.rating-summary/.add-review CSS
TESTS: tests/routes/api.test.ts:31-39 covers /api/books/:id only (no HTML page test); tests/models/book.test.ts covers getBookById. Tmp DBs: /tmp/test-*.db (check per file; not enumerated here)
RULES: 1 keep search stub and review/user/shelf test gaps; 2 SQL via all/get/run with ?; 3 .js import suffix; 5 HTML routes render, HTMX errors are <p class="error">; 6 never use ./bookshelf.db in tests; 7 reuse style.css classes
UNCLEAR: Task folder says the page should exist already (show.ejs, route, card links all present in this copy); planner should confirm whether the task is already done or whether something is missing. Review form user dropdown hardcodes user ids 1-3 (show.ejs:62-66). Route at books.ts:25 has no test for 404 HTML page.
