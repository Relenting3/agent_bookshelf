---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/edit-review/`.

Scout map:
TASK: Add an inline Edit button per review on `/books/:id`. Edit swaps that review for a prefilled rating/text form. Save updates in place, Cancel restores, and errors return 400 (bad rating) or 404 (missing review).

FILES:
- `src/views/books/show.ejs:37-46` — review markup duplicated inline; `#reviews-list` wraps it, not the fragment
- `src/views/books/reviews-list.ejs:4-14` — fragment used by POST; same review markup, no id on root
- `src/routes/books.ts:39-56` — POST reviews pattern: 400/409 HTML `<p class="error">`, renders `books/reviews-list`
- `src/routes/books.ts:25-37` — GET book page; passes `book`, `reviews`, `averageRating`
- `src/models/review.ts:41-49` — `getReviewById`, returns undefined when missing (404 check)
- `src/models/review.ts:66-87` — `updateReview(id, {rating, reviewText})`; returns undefined if missing
- `src/routes/reviews.ts:6-15` — only GET `/reviews/:id`; no HTML edit route here
- `src/public/css/style.css:121-150, 165-220` — `.review*` styles; `.form-group`, `.btn-primary`, `.btn-remove`

REUSE: `Review.updateReview`, `Review.getReviewById`; `hx-post`/`hx-target="#reviews-list"`/`hx-swap="outerHTML"` pattern from show.ejs:53-57; `<p class="error">` fragment convention (books.ts:44,49); `res.status(404).render('error', …)` pattern (books.ts:30, reviews.ts:11); `.form-group`, `.btn-primary`, `.btn-remove`; `.review` card classes.

TESTS: `tests/routes/api.test.ts` (uses `/tmp/test-api.db`), `tests/models/book.test.ts` (`/tmp/test-book-model.db`), `tests/db.test.ts` (`/tmp/test-bookshelf.db`), `tests/setup.ts` (unwired, also `/tmp/test-bookshelf.db`). No existing tests cover HTML book/review routes. New test file needs a fresh tmp path (not one of the above).

RULES:
- 1: Don't fill homework gaps (search stub, model tests for user/review/shelf, API validation)
- 2: SQL only via `all`/`get`/`run` with `?` placeholders (model already complies)
- 3: Relative imports in `src/` and `tests/` end in `.js`
- 5: HTML routes return `res.render` or `<p class="error">` fragments for HTMX; never JSON
- 6: Never use `./bookshelf.db`; never reuse a test tmp path; run `npm run test:run`
- 7: Reuse existing CSS classes; new CSS uses palette (#2c3e50, #3498db, #e74c3c, #ddd, 4/8px radii)

UNCLEAR:
- Whether the Edit button and form should use HTMX (matching the add-review pattern) or a plain page reload. The task says "without a page reload", so HTMX is implied.
- Whether a missing review on Save should return 404 as an HTMX fragment or a full error page; task says "404 with an error message in the form", which suggests a fragment, but the 404 criterion is ambiguous.
- Which route shape to use (e.g. `GET/PATCH /books/:id/reviews/:reviewId` or under `/reviews/:id`) is not specified.
- Whether a review's `book_id` must match the `:id` in the URL when saving (task does not say).
- Cancel: whether it should refetch the review from the server or restore from cached markup (task does not say).
