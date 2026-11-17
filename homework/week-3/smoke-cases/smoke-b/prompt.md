---
runs: 1
tags: [smoke]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/smoke-rating-count/`.

Scout map:
- `src/routes/books.ts`: `GET /books/:id` (lines 25-37) renders `books/show` with `book`, `reviews`, `averageRating`
- `src/models/review.ts`: `getReviewsByBookId` (line 19), `getAverageRating` (line 94)
- `src/views/books/show.ejs`: average rating block (lines 21-27), `Reviews (<%= reviews.length %>)` heading (line 30)
- `tests/routes/api.test.ts`: supertest route test pattern, own tmp DB
