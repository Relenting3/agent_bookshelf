---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/api-validation/`.

Scout map:
TASK: Add input validation to every `/api` route that takes input: ids (positive integers), required fields and types on books, reviews, users and shelves, returning 400 on bad input before any model call. Valid requests and existing tests must keep working.

FILES:
- `src/routes/api.ts:15-240` — all `/api` handlers; every `parseInt(req.params.*)` has no check
- `src/routes/api.ts:133-151` — POST /reviews; existing `!rating` and 1–5 range checks, no integer/type check
- `src/routes/api.ts:153-162` — PATCH /reviews/:id; passes raw `req.body` to `Review.updateReview`, no rating check
- `src/routes/api.ts:26-46` — POST/PATCH /books; POST destructures fields at 27, PATCH passes raw `req.body` at 39
- `src/routes/api.ts:76-95` — POST/PATCH /users; POST destructures `username`, `displayName` at 77
- `src/routes/api.ts:193-202` — POST /shelves; destructures `userId`, `name` at 194
- `src/routes/api.ts:215-233` — POST /shelves/:id/books and DELETE; `bookId` from body/params, no check
- `tests/routes/api.test.ts:1-14` — supertest setup, `/tmp/test-api.db`
- `tests/routes/api.test.ts:74` — existing "validates rating range" test, must still pass

REUSE: Inline pattern `res.status(400).json({ error: ... })` at `src/routes/api.ts:136-141`; `parseInt(..., 10)` id pattern in each handler; 404 via falsy model return.

TESTS: `tests/routes/api.test.ts` (uses `/tmp/test-api.db`, supertest on `app`); `tests/models/book.test.ts` (uses `/tmp/test-book-model.db`); `tests/db.test.ts` (uses `/tmp/test-bookshelf.db`); `tests/setup.ts` is unwired and also points at `/tmp/test-bookshelf.db`. Do not reuse these paths.

RULES: 2 (SQL stays parameterized; no new SQL), 3 (`.js` import suffixes in new code), 5 (`/api` returns JSON 400 bodies only), 1 (leave HTML routes and other homework gaps alone; validation in `api.ts` is the explicit exception), 6 (tests use own tmp DB, never `./bookshelf.db`), 7 (N/A, no UI).

UNCLEAR: Whether PATCH bodies should be validated per field (e.g. rejecting wrong-typed or unknown fields on `/books/:id` and `/users/:id`) or only `rating` as stated; whether `published_year` on PATCH is in scope (criteria only mention POST); whether `shelves/:id/books` `bookId` needs id validation (criterion 1 says any `:id`, so likely yes); whether `reviewText` needs type checks; and the 400 error message wording.
