# Task: Route tests for the shelves pages

## Description

`src/routes/shelves.ts` has no tests: `GET /shelves`, `GET /shelves/user/:userId`, `GET /shelves/:id`, `POST /shelves/:id/books` and `DELETE /shelves/:id/books/:bookId`.

## What to build

A new `tests/routes/shelves.test.ts` using supertest, like `tests/routes/api.test.ts`. Point it at `/tmp/test-bookshelf.db`, the same database `tests/db.test.ts` uses, so both files see the same data and we don't pile up tmp files.

## Acceptance criteria

1. Each of the five routes has a test for its success case (status and a visible piece of content).
2. The 404s for an unknown user and an unknown shelf are tested.
3. Adding a book returns the updated list fragment; removing it returns the list without it.
4. The test file uses `/tmp/test-bookshelf.db`.
5. `npm run test:run` passes, also when run several times in a row.

## Out of scope

- Changes to `src/`, including the `books-list.ejs` id bug.
- Model tests (homework gaps).
