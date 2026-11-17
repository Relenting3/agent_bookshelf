# Task: Delete a review from the book page

## Description

On a book page (`/books/:id`), reviews can be added through the HTMX form (`POST /books/:id/reviews`) but not removed. The JSON API has `DELETE /api/reviews/:id`, but the page doesn't use it.

## What to build

A Delete button on each review on the book page. Clicking it asks for confirmation, deletes the review and refreshes the review list without a full page reload.

## Acceptance criteria

1. Each review on `/books/:id` has a Delete button with a confirmation prompt.
2. After confirming, the review is gone from the list without a reload, and from the database.
3. Deleting the last review shows the "No reviews yet" message.
4. Deleting a review that no longer exists (e.g. deleted in another tab) shows an error message in the page, not a crash.
5. Adding a review right after a delete still works on the same page, and so does a second delete.

## Out of scope

- Who may delete a review (there's no auth).
- Changes to the JSON API.
- Refreshing the average rating block and the "Reviews (N)" count.
