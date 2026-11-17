# Task: Confirm when a book is added to a shelf

## Description

On a shelf page (`/shelves/:id`), the "Add to Shelf" form posts through HTMX to `POST /shelves/:id/books` and the list refreshes, but nothing tells the user it worked. Adding a book that's already on the shelf silently does nothing.

## What to build

Change `POST /shelves/:id/books` to return JSON instead of HTML: `{ "added": true, "message": "Added Dune to want-to-read", "books": [...] }`, or `{ "added": false, "message": "Dune is already on this shelf" }`. The page reads the JSON, shows the message above the list for a few seconds, and re-renders the list from `books`.

## Acceptance criteria

1. Adding a new book returns 200 JSON with `added: true`, the message and the shelf's books. The page shows the message and the updated list.
2. Adding a book that's already on the shelf returns JSON with `added: false` and the message. The list is unchanged.
3. A missing `bookId` returns a 400 JSON body `{ "error": "..." }`.

## Out of scope

- Removing books from a shelf.
- The JSON API under `/api`.
