---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/delete-review/`.

Scout map:
TASK: Add a per-review Delete button on /books/:id with hx-confirm, HTMX delete that refreshes #reviews-list, "No reviews yet" on empty, inline error on missing review, no full reload.
FILES:
- `src/views/books/show.ejs:29-49` — reviews block; `#reviews-list` wraps the loop (line 32); no delete button yet
- `src/views/books/reviews-list.ejs:1-16` — HTMX fragment returned after POST; has no delete button; root is not an id'd element
- `src/routes/books.ts:39-56` — POST /books/:id/reviews; pattern to copy (409 `<p class="error">`, renders reviews-list)
- `src/models/review.ts:41-43, 89-92` — getReviewById (returns undefined if missing) and deleteReview (returns boolean)
- `src/routes/api.ts:164-170` — existing DELETE /api/reviews/:id; do not change
- `src/views/books/show.ejs:51-88` — add-review form (hx-target #reviews-list, outerHTML); must keep working after delete
- `src/public/css/style.css` — existing `.btn-remove` class to reuse (not yet inspected)
REUSE: `Review.deleteReview`/`getReviewById`; `reviews-list.ejs` fragment re-render; `hx-confirm` + `hx-target`/`hx-swap="outerHTML"` pattern from `src/views/shelves/books-list.ejs:12-15`; `.btn-remove`; `p.error` fragment style
TESTS: `tests/routes/api.test.ts` (uses /tmp/test-api.db), `tests/models/book.test.ts` (/tmp/test-book-model.db), `tests/db.test.ts` (/tmp/test-bookshelf.db). No test covers books.ts page routes or review model. Taken: /tmp/test-api.db, /tmp/test-book-model.db, /tmp/test-bookshelf.db (setup.ts also uses this). Pick a new path for any new test file.
RULES: 1 do not fill search stub or review/user/shelf model test gaps; 2 SQL only via all/get/run with ?; 3 relative imports end in .js; 5 HTMX endpoints return HTML fragments, not JSON; 6 never use ./bookshelf.db, unique /tmp path; 7 reuse style.css classes, no restyling
UNCLEAR: Delete route path (e.g. `POST/DELETE /books/:id/reviews/:reviewId` vs. reusing API) not specified; whether 404 should be `p.error` HTML with 404 status; whether the error should replace the list or sit beside it (task says "error message in the page"); whether the review's own user/book ownership is checked (out of scope per task).
