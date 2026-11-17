# Task: Book search

## Description

The search box on the home page (`/`) sends `GET /books/search?q=…` through HTMX as you type, and the response replaces the contents of `#search-results`. The route is a stub that always answers "Search functionality coming soon!". `Book.searchBooks(query)` already exists in `src/models/book.ts`.

## What to build

Make `GET /books/search` return the matching books as an HTML fragment, shown with the same cards as the home page.

## Acceptance criteria

1. `GET /books/search?q=dune` returns a fragment that lists "Dune" and no unrelated books.
2. Matching covers title and author: `q=weir` finds both Andy Weir books.
3. An empty or missing `q` shows all books, like the home page.
4. A query with no match shows a "No books found" message.
5. The response is an HTML fragment (no `<nav>`, not a full page), never JSON.

## Out of scope

- Search in the JSON API.
- Ranking, fuzzy matching, pagination of results.
