# Task: Book detail page

## Description

On the home page you only see each book's title, author and year. Users want a page per book.

## What to build

A page at `GET /books/:id` with the title, author, year, ISBN, description, average rating and the reviews, plus a form to add a review. Link each book card on the home page to it.

## Acceptance criteria

1. `/books/1` shows "The Pragmatic Programmer" with its author, year, ISBN and description.
2. It shows the average rating and the list of reviews.
3. `/books/9999` returns 404 with the error page.
4. Each card on `/` links to its book page.

## Out of scope

- Editing books.
