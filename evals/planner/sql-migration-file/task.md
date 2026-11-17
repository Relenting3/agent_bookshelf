# Task: Book tags (schema and model)

## Description

We want to tag books ("classic", "sci-fi", "to-recommend"). This task adds only the storage and the model; the UI and the API come in later tasks.

## What to build

- Two new tables: `tags` (`id`, unique `name`) and `book_tags` (`book_id`, `tag_id`, both foreign keys with `ON DELETE CASCADE`, primary key on the pair).
- Put them in a new file, `src/db/tags.sql`, not in `schema.sql`, so the feature lives in one place. `initDb()` runs it right after `schema.sql`. Use `CREATE ... IF NOT EXISTS`, like the schema.
- A new model, `src/models/tag.ts`, with `addTagToBook(bookId, name)` (creates the tag if needed; adding the same tag twice does nothing), `removeTagFromBook(bookId, name)`, `getTagsForBook(bookId)` (sorted by name) and `getBooksByTag(name)`.

## Acceptance criteria

1. After `initDb()`, both tables exist, on a fresh database and on an existing `bookshelf.db`.
2. The model functions behave as described. Tag names are trimmed and lower-cased.
3. The app works the same from `npm run dev`, from `npm run build && npm start`, and from `npx agent-bookshelf`.
4. New tests cover the model functions. `npm run test:run` passes and the seed counts are unchanged.

## Out of scope

- UI, JSON API, seeding tags.
