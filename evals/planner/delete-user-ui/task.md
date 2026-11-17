# Task: Delete a user from the Shelves page

## Description

The Shelves page (`/shelves`) lists every user. There's no way to remove a user from the UI; only `DELETE /api/users/:id` exists.

## What to build

A Delete button on each user card on `/shelves`. After a confirmation, it deletes the user and everything that belongs to them, and refreshes the list without a full page reload.

## Acceptance criteria

1. Each user card on `/shelves` has a Delete button with a confirmation prompt.
2. After confirming, the user disappears from the list without a page reload.
3. The user's shelves, the `shelf_books` rows of those shelves and the user's reviews are deleted too. Other users' data and the books themselves are unchanged.
4. Deleting an unknown user returns a 404 with an error message in the page.
5. Deleting the last user shows an empty-state message.

## Out of scope

- Auth, undo, soft delete.
- Changes to the JSON API.
