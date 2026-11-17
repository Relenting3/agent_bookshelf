---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/seed-more-books/`.

Scout map:
TASK: Add five engineering-practice and management books to `src/db/seed.sql` (with ISBN, one-line description, year), keeping ids 1–50 and users/shelves/reviews unchanged, so a fresh DB has 55 books.
FILES:
- `src/db/seed.sql:9-60` — books INSERT; line 60 ends with `);`, append five rows here.
- `src/db/seed.sql:2` — header comment says "~50 books"; optionally update.
- `src/db/seed.sql:62-64` — shelves section follows; references user ids 1–3 only, no book ids (confirm before editing).
- `tests/db.test.ts:24-26` — asserts COUNT(*) = 50; must become 55.
- `tests/models/book.test.ts:23` — getAllBooks() length 50; must become 55. Line 24 first title "1984" stays valid.
- `tests/routes/api.test.ts:25` — /api/books length 50; must become 55.
- `src/db/schema.sql:5` — `isbn TEXT UNIQUE`; new ISBNs must be unique and hyphenated like existing `978-…` values.
- `tests/setup.ts:5` and `tests/db.test.ts:5,12` — both use `/tmp/test-bookshelf.db`; not a task concern, noted only.
REUSE: Row format `('Title', 'Author', '978-XXXXXXXXXX', NULL, 'Description.', Year)`; escape apostrophes as `''` (e.g. `Manager''s Path`).
TESTS: `tests/db.test.ts`, `tests/models/book.test.ts`, `tests/routes/api.test.ts` (all assert 50 books, need 55). Tmp DB paths in use: `/tmp/test-bookshelf.db` (db.test.ts, setup.ts); paths used by book.test.ts and api.test.ts were not checked.
RULES: 1 (don't fill homework gaps; no reviews/shelves for new books), 6 (editing seed.sql means updating count/title tests and running `npm run test:run`), 2 (no request values in SQL, n/a for seed), 4 (seed.sql already copied by copy-assets; no new files needed).
UNCLEAR: ISBNs are not given in task.md; the planner must supply valid, unique ISBNs (or ask the user). Also whether the "~50" header comment (line 2) and "50 titles" comment (line 9) should change.
