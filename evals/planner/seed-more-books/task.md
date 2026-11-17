# Task: Add five books to the seed data

## Description

The seed has 50 books, mostly software classics and science fiction and fantasy. Add five books on engineering practice and management.

## What to build

Add these to `src/db/seed.sql`, each with an ISBN, a one-line description and the year:

- Team Topologies, Matthew Skelton and Manuel Pais, 2019
- Staff Engineer, Will Larson, 2021
- The Manager's Path, Camille Fournier, 2017
- A Philosophy of Software Design, John Ousterhout, 2018
- Working Effectively with Legacy Code, Michael C. Feathers, 2004

## Acceptance criteria

1. A fresh database has 55 books, including these five with the given authors and years.
2. The existing books keep their ids (1–50), so the seeded shelves and reviews still point at the same books.
3. The users, shelves and reviews in the seed are unchanged.
4. `npm run test:run` passes.

## Out of scope

- Reviews or shelf entries for the new books.
- Migrating an existing `bookshelf.db` (deleting it to reseed is fine).
