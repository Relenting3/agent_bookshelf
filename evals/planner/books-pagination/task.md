# Task: Paginate the home page

## Description

`/` renders every book in one grid. The catalogue will grow well past the seeded 50.

## What to build

Show 20 books per page on `/`, sorted by title as today, with Previous and Next links and a "Page 2 of 3" label.

## Acceptance criteria

1. `GET /` shows the first 20 books by title and "Page 1 of 3" (with the seeded 50 books).
2. `GET /?page=3` shows the last 10 books.
3. A missing, non-numeric, zero or negative `page` shows page 1. A page past the end shows the last page.
4. Previous is hidden on page 1, and Next on the last page.
5. The search box keeps working: its results still replace the grid.
6. `getAllBooks()` keeps its current behaviour for its other callers.

## Out of scope

- Pagination in the JSON API (`/api/books`).
- A page-size selector.
- Paginating search results.
