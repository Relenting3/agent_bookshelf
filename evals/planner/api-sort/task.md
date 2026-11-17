# Task: Sort option for the books API

## Description

`GET /api/books` always returns the books sorted by title. A client also wants them by publication year.

## What to build

An optional `sort` query parameter on `GET /api/books`: `sort=title` (the default, A to Z) or `sort=year` (`published_year`, oldest first, then by title). Books without a year come last.

## Acceptance criteria

1. `GET /api/books` and `GET /api/books?sort=title` return the same order as today.
2. `GET /api/books?sort=year` returns the books by `published_year` ascending, ties by title, books without a year last.
3. Any other `sort` value falls back to the default order. It's not an error.
4. The response is still a JSON array of all the books.
5. The HTML home page is unchanged.

## Out of scope

- Descending order, other sort fields, pagination.
- Validation of other API parameters.
