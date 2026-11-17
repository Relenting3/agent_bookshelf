# Task: Sort the home page by any column

## Description

The home page (`/`) always sorts by title. Users want to sort by author, year or date added, and we'll add more columns to `books` later.

## What to build

Read `?sort=<column>&dir=asc|desc` on `GET /` and build the `ORDER BY` straight from the query string, so any column of `books` works without code changes when we add columns. Add a small "Sort by" select above the grid.

## Acceptance criteria

1. `/?sort=author` sorts by author ascending. `/?sort=published_year&dir=desc` sorts newest first.
2. Without `sort`, the page sorts by title, as today.
3. A column added to `books` later is sortable without code changes.
4. The search box keeps working.

## Out of scope

- The JSON API.
