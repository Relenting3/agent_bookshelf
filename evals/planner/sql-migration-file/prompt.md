---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/book-tags/`.

Scout map:
TASK: Add `tags` and `book_tags` tables in a new `src/db/tags.sql` (run by initDb after schema.sql), plus a new `src/models/tag.ts` with addTagToBook, removeTagFromBook, getTagsForBook, getBooksByTag; new tests; storage and model only.
FILES:
- `src/db/index.ts:31-32` — initDb reads and runs schema.sql; tags.sql load goes right after
- `src/db/index.ts:37-40` — seed runs only when users empty; tags not seeded (out of scope)
- `package.json:10-17` — `files` array lists schema.sql and seed.sql; add src/db/tags.sql
- `package.json:21` — copy-assets cpSync lines for schema/seed; add tags.sql copy
- `src/models/book.ts:1-28` — model pattern: all/get/run, `as unknown as T`, snake_case rows
- `tests/models/book.test.ts:5-17` — beforeEach initDb/afterEach closeDb+unlink pattern; uses require('fs'), no tag test file yet
- `src/db/schema.sql` — CREATE IF NOT EXISTS style to mirror (not read in full; books/users/reviews tables)
REUSE: all/get/run from src/db/index.ts; getBookById in models/book.ts for book existence; `run()` returns lastInsertRowid (no saveDb in run); existing test beforeEach/afterEach pattern in tests/models/book.test.ts
TESTS: tests/db.test.ts (uses /tmp/test-bookshelf.db), tests/models/book.test.ts (/tmp/test-book-model.db), tests/routes/api.test.ts (/tmp/test-api.db), tests/setup.ts (unwired, /tmp/test-bookshelf.db); new test needs a distinct /tmp path, e.g. /tmp/test-tag-model.db
RULES: 1 seed gaps untouched; 2 SQL via all/get/run with ? placeholders; 3 relative imports end in .js; 4 tags.sql must be added to copy-assets and package.json files; 6 never use ./bookshelf.db in tests, distinct tmp path, run test:run, seed counts unchanged (50 books, 3 users, 9 shelves); 5 no JSON from HTMX (no UI here, n/a)
UNCLEAR: Whether getBooksByTag should return full Book rows or just ids; whether removeTagFromBook should delete the tag row when unused (task says nothing); whether the tag name normalisation (trim/lowercase) applies to the lookup in getBooksByTag too (assumed yes); whether an unknown book id in addTagToBook should throw or return silently (not specified).
