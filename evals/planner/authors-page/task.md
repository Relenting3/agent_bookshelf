# Task: Authors pages

## Description

Books can only be browsed by title. There's no way to see all the books by one author.

## What to build

- `GET /authors`: every distinct author, sorted by name, each with their number of books, e.g. "Andy Weir (2)". Each author links to their page.
- `GET /authors/:name`: the author's name as the heading, then their books sorted by title, shown with the same cards as the home page.
- An "Authors" link in the nav, next to "Shelves".

Put the routes in a new router file, `src/routes/authors.ts`, mounted at `/authors`. The queries go in `src/models/book.ts`.

## Acceptance criteria

1. `GET /authors` returns 200 with one entry per distinct `books.author` value, sorted by name, each with its book count.
2. "Andy Weir" shows a count of 2, and its link opens `/authors/Andy%20Weir`, which lists "Project Hail Mary" and "The Martian".
3. An author with no books (e.g. `/authors/Nobody`) returns 404 with the normal error page.
4. Author names with dots, commas or `&` (e.g. "J.R.R. Tolkien") link and load correctly.
5. Every page shows the "Authors" link in the nav.
6. The new pages look like the rest of the app.

## Out of scope

- Splitting multi-author strings ("Gene Kim, Kevin Behr, and George Spafford") into separate authors: each distinct `author` value is one entry.
- An authors table or any schema change.
- JSON API endpoints.
