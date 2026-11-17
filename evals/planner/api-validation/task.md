# Task: Input validation for the JSON API

This is a homework task: gap #3 (missing input validation in `src/routes/api.ts`), an explicit exception to CLAUDE.md rule 1.

## Description

The `/api` routes trust their input. `POST /api/books` with `"published_year": "soon"` stores a string, `PATCH /api/books/abc` reaches the model with `NaN`, and `POST /api/reviews` with `"rating": "4.5"` passes the range check and is stored as 4.5.

## What to build

Validate ids, required fields and field types on every `/api` route that takes input, and reject bad input before it reaches a model.

## Acceptance criteria

1. A non-numeric or non-positive `:id` in any `/api` path returns 400.
2. `POST /api/books`: `title` and `author` must be non-empty strings; `published_year`, if present, must be an integer. Otherwise 400.
3. `POST /api/reviews` and `PATCH /api/reviews/:id`: `rating` must be an integer from 1 to 5 (a number, not a numeric string). Otherwise 400.
4. `POST /api/users` and `POST /api/shelves`: required string fields must be non-empty after trimming. Otherwise 400.
5. Valid requests behave exactly as today, and the existing tests still pass.

## Out of scope

- Validation in the HTML routes (`books.ts`, `shelves.ts`).
- Adding a validation library.
