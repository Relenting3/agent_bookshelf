# Task: Tests for the user model

This is a homework task: gap #2 (missing model tests), an explicit exception to CLAUDE.md rule 1. Only `models/user.ts` is in scope.

## Description

`src/models/user.ts` has no tests. `tests/models/book.test.ts` shows the pattern for model tests.

## What to build

Tests for every exported function in `src/models/user.ts`: `getAllUsers`, `getUserById`, `getUserByUsername`, `createUser`, `updateUser` and `deleteUser`.

## Acceptance criteria

1. Each exported function has a test for the normal case, and one for the not-found case where it has one.
2. Tests use the seed data (3 users: Alice Chen, Bob Martinez, Carol Okafor) and don't depend on each other's order.
3. `createUser` with an existing username is tested to throw (the UNIQUE constraint).
4. `npm run test:run` passes and the existing tests are unchanged.

## Out of scope

- Tests for `models/review.ts` and `models/shelf.ts` (other homework gaps).
- Fixing a bug the tests find: report it instead.
