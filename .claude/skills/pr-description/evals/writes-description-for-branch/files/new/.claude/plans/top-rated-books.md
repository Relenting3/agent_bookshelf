# Plan: Top rated books page

## Goal
Readers want a quick way to find the best-reviewed books. Add a "Top rated" page listing the 10 books with the highest average rating, plus a JSON endpoint for the same data.

## Steps
1. `src/models/book.ts`: add `getTopRatedBooks(limit = 10)` joining `reviews`, ordered by average rating, then review count, then title. Placeholder for LIMIT.
2. `src/routes/books.ts`: `GET /books/top` renders `books/top.ejs`. Register it before `/books/:id` so "top" isn't parsed as an id.
3. `src/routes/api.ts`: `GET /api/books/top?limit=N` returns JSON. Same ordering rule as step 2.
4. `src/views/books/top.ejs`: ordered list with title link, author, average (1 decimal) and review count. Empty state "No reviews yet."
5. `src/views/partials/header.ejs`: nav link "Top rated".
6. `tests/models/book.test.ts`: test ordering and that unreviewed books are excluded.

## Acceptance criteria
- `/books/top` shows at most 10 books, highest average first.
- Books with no reviews never appear.
- `/api/books/top` returns the same list as JSON; `?limit=` changes the count.

## Out of scope
- Pagination, filtering by genre.
- Input validation for `limit` (homework gap: API validation stays open).

## Open questions
- Should a book need a minimum number of reviews to qualify? Currently one 5-star review puts a book at the top.
