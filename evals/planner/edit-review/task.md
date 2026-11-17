# Task: Edit a review inline

## Description

A review can be added on the book page but not changed. `Review.updateReview(id, { rating, reviewText })` already exists in `src/models/review.ts` and is used by `PATCH /api/reviews/:id`. No HTML route uses it.

## What to build

An Edit button on each review on the book page. It swaps that review for an inline form (rating and text) prefilled with the current values. Save updates the review in place; Cancel restores it.

## Acceptance criteria

1. Each review on `/books/:id` has an Edit button. Clicking it replaces that review, and only that one, with a prefilled form, without a page reload.
2. Saving with a rating from 1 to 5 updates the review in the database and shows the updated review in place.
3. Saving with no rating, or a rating outside 1–5, returns a 400 with an error message in the form. The review is unchanged.
4. Cancel shows the review as it was, without saving.
5. Editing a review that no longer exists returns a 404 with an error message.

## Out of scope

- Who may edit a review (there's no auth).
- Changes to the JSON API.
- Refreshing the average rating block.
