# Plan: Show the number of ratings on the book page

Task: ./task.md

## Approach
`GET /books/:id` already passes `averageRating` to `books/show`. Add one model function,
`getRatingCount(bookId)`, in `src/models/review.ts`. It uses the same `WHERE book_id = ?` filter as
`getAverageRating`, so the count matches the reviews the average is computed from. The route passes
the count as `ratingCount`. The view prints it inside the existing `.rating-summary` block,
right after "X.X / 5". The JSON API, the HTMX review fragment, and the CSS stay unchanged.

## Decisions
- Count with `COUNT(rating)`, not `reviews.length`. `AVG` skips NULL ratings, and the schema allows NULL (`CHECK` only, no `NOT NULL`), so `COUNT(rating)` is the count the average is actually based on (see Open question 1).
- Put the count in `<span class="rating-count">` inside `.rating-summary`. This gives tests a stable hook. No new CSS (rule 7), so the span inherits the summary's styling.
- Pluralisation lives in the view: `1` gives "rating", anything else gives "ratings". The count only renders inside the existing `if (averageRating)` branch, so a book with no reviews still shows neither the average nor the count.
- No model unit test for `getRatingCount`. Tests for `models/review.ts` are a deliberate homework gap (CLAUDE.md rule 1), so the new function is covered through the route test only.

## Contract
- `GET /books/:id` returns status 200 and a full HTML page (template `books/show`). The status codes and the 404 path don't change.
- When the book has at least one rated review, the page contains `<div class="rating-summary">`, which contains:
  - the existing text `<avg.toFixed(1)> / 5`
  - `<span class="rating-count">(<n> rating|ratings)</span>`, where the text is exactly `(1 rating)` for n = 1 and `(<n> ratings)` for n ≥ 2
- When the book has no reviews, the page contains no `rating-summary`, no `rating-count`, no "Average Rating", and nothing that matches `/\(\d+ ratings?\)/`.
- Model: `getRatingCount(bookId: number): number` in `src/models/review.ts`. It returns 0 when there are no reviews.
- `GET /api/books/:id` and every other `/api/*` response stay the same: no new keys such as `ratingCount` or `rating_count`.
- Seed facts the tests can use (unchanged seed):
  - book 1 "The Pragmatic Programmer": 2 reviews (5, 4), average 4.5
  - book 2 "Clean Code": 1 review (4), average 4.0
  - book 5 "The Mythical Man-Month": 0 reviews
  - user 3 (Carol) has not reviewed book 1

## Acceptance criteria
- AC-1: Given seed data, when `GET /books/1` is requested, then the response is 200, contains `4.5 / 5`, and contains `<span class="rating-count">(2 ratings)</span>`.
- AC-1b: Given Carol (user 3) adds a review of book 1 with rating 3 (via `POST /books/1/reviews` or `createReview(3, 1, 3)`), when `GET /books/1` is requested, then the page contains `4.0 / 5` and `(3 ratings)`.
- AC-2: Given seed data, when `GET /books/2` is requested, then the page contains `4.0 / 5` and `(1 rating)`, and does not contain `(1 ratings)`.
- AC-3: Given seed data, when `GET /books/5` is requested, then the response is 200, contains `Reviews (0)`, and contains none of `rating-summary`, `rating-count`, `Average Rating`, or any match for `/\(\d+ ratings?\)/`.
- AC-4: When `GET /api/books/1` is requested, then the response is 200 JSON, `title` is "The Pragmatic Programmer", and the body has no `ratingCount`, `rating_count`, or `averageRating` key. The existing `tests/routes/api.test.ts` passes unchanged.

## Implementation (src/ — implementer)
1. `src/models/review.ts`: add `export function getRatingCount(bookId: number): number` next to `getAverageRating`. SQL: `SELECT COUNT(rating) as rating_count FROM reviews WHERE book_id = ?` with `[bookId]` passed through `get()` (rule 2). Return `Number(result?.rating_count ?? 0)`.
2. `src/routes/books.ts` (`GET /books/:id`, lines 25-37): call `Review.getRatingCount(bookId)` and add `ratingCount` to the `res.render('books/show', …)` locals. Leave the other routes alone; the search stub at lines 12-23 stays as it is (rule 1).
3. `src/views/books/show.ejs` (lines 21-27): after `<%= averageRating.toFixed(1) %> / 5`, add `<span class="rating-count">(<%= ratingCount %> <%= ratingCount === 1 ? 'rating' : 'ratings' %>)</span>`. Write it on one line so the span text is exactly `(2 ratings)`. Change nothing else in the template.
4. No changes to `src/routes/api.ts`, `src/public/css/style.css`, `package.json`, or the seed or schema. No new runtime files, so no copy-assets change is needed (rule 4).

## Tests (tests/ — test-writer)
- New `tests/routes/books.test.ts` (tmp DB `/tmp/test-books-routes.db`, with its own `beforeEach` `await initDb(...)` and an `afterEach` that calls `closeDb()` and unlinks the file, following `tests/routes/api.test.ts`): covers AC-1, AC-1b, AC-2, AC-3, AC-4.
  - Import `app` from `'../../src/server.js'`. If AC-1b uses the model directly, import from `'../../src/models/review.js'` (rule 3).
  - Assert on substrings of `res.text`, not on surrounding whitespace.
- No new test file for `models/review.ts` (homework gap, rule 1).

## Out of scope
- Any change to the JSON API (task AC-4).
- Updating the average or count live after an HTMX review submit. `POST /books/:id/reviews` only replaces `#reviews-list`, and that stays as it is today.
- Showing rating counts on the book list (`/`) or on shelf pages.
- Unit tests for `models/review.ts`, and input validation in `api.ts` (homework gaps).

## Open questions
1. Which number should the count show: rated reviews or all reviews?
   Recommended (used in the plan): `COUNT(rating)` through a new `getRatingCount` model function, so it always matches what `AVG` averages. · Alternatives: use `reviews.length` in the route or view (no model change; differs only if a review has a NULL rating) | `COUNT(*)` model function.
2. Markup for the count.
   Recommended (used in the plan): `<span class="rating-count">(n ratings)</span>` inside `.rating-summary`, with no new CSS. · Alternative: plain text with no wrapper (tests then match on `(n ratings)` only).
