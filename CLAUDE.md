# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Agent Bookshelf is a Goodreads-lite app built as a **teaching playground for an AI-agents course**. Students run it locally and use agents to do homework against it. The codebase has **deliberate gaps** (see Rules). Stack: Express + TypeScript (ESM), SQLite via **sql.js** (WebAssembly, no native modules), EJS views, HTMX, Vitest. See `docs/adr/001-architecture.md` for the rationale.

## Commands

```bash
npm install              # postinstall runs `npm run build` automatically
npm run dev              # tsx watch src/server.ts → http://localhost:3000 (PORT env overrides)
npm run build            # tsc → dist/, then copy-assets (schema.sql, seed.sql, views/, public/ → dist/)
npm start                # node dist/server.js (same as `npx agent-bookshelf` via bin/)
npx tsc --noEmit         # typecheck only (there is no linter configured)

npm test                 # vitest watch mode
npm run test:run         # vitest single run
npx vitest run tests/models/book.test.ts              # one file
npx vitest run tests/models/book.test.ts -t "getBookById"   # one test/describe by name
```

## Architecture

**Request flow:** `src/server.ts` mounts four routers, then `initDb()` runs before `listen`:

| Mount | File | Returns |
|---|---|---|
| `/` | `routes/books.ts` | full EJS pages + HTMX partials |
| `/shelves` | `routes/shelves.ts` | full EJS pages + HTMX partials |
| `/reviews` | `routes/reviews.ts` | full EJS page |
| `/api` | `routes/api.ts` | JSON only (books, users, reviews, shelves CRUD) |

HTML routes and the JSON API both call the same model functions; there is no service layer.

**Data layer (`src/db/index.ts`)** — a module-level singleton sql.js `Database`:
- `initDb(path?)` loads the file at `path` (default `./bookshelf.db` in the **cwd**) into memory, runs `schema.sql` (all `CREATE ... IF NOT EXISTS`), runs `seed.sql` only if `users` is empty, then writes the file.
- Helpers `all()`, `get()`, `run()` wrap prepared statements; `run()` returns `{ changes, lastInsertRowid }` via `SELECT changes(), last_insert_rowid()`.
- **Persistence gotcha:** the DB lives in memory. `saveDb()` is only called from `initDb()` and `closeDb()`; `run()` does not save, and the server never calls `closeDb()`. Writes made through the running app are lost on restart unless you call `saveDb()`.
- sql.js's `.wasm` is located via `__dirname/../../node_modules/sql.js/dist`, which resolves correctly from both `src/db/` (tsx) and `dist/db/` (built).
- `schema.sql`/`seed.sql` are read with `readFileSync(join(__dirname, ...))`, so they must exist next to the compiled JS, which is why `copy-assets` exists.

**Models (`src/models/*.ts`)** are plain exported functions (no classes, no db argument) that call the db helpers and cast rows with `as unknown as T`. Column names are snake_case in rows (`cover_url`, `published_year`). Some function args are camelCase (`reviewText`, `displayName`) and are mapped to columns inside the model.

**Views:** each page template does `<%- include('../partials/header') %>` … `include('../partials/footer')`. `views/layout.ejs` is **not used**, since EJS has no layout support and nothing renders it. HTMX endpoints render a fragment template (`books/reviews-list.ejs`, `shelves/books-list.ejs`) that replaces a target via `hx-swap="outerHTML"`. The fragment's root element id must match the `hx-target` (`#reviews-list`, `#shelf-books-list`). `htmx.min.js` is vendored in `src/public/`.

**Schema** (`src/db/schema.sql`): `books`, `users`, `shelves` (UNIQUE user_id+name), `shelf_books` (join table), `reviews` (rating CHECK 1–5, UNIQUE user_id+book_id). FKs use `ON DELETE CASCADE` and `PRAGMA foreign_keys = ON` is set at init.

**Seed data:** 50 books, 3 users (Alice Chen, Bob Martinez, Carol Okafor), shelves, and reviews. Tests assert on this data, e.g. 3 users, 9 shelves, 50 books, book id 1 = "The Pragmatic Programmer", first by title = "1984".

## Testing conventions

- There are three test files, one per layer:
  - `tests/db.test.ts` tests the DB layer directly. It calls `all('SELECT COUNT(*) ...')` and asserts on the seed: 3 users, 50 books, 9 shelves (3 per user), and at least one review. Use this pattern for schema or seed checks that shouldn't go through a model.
  - `tests/models/book.test.ts` tests model functions.
  - `tests/routes/api.test.ts` tests HTTP routes with supertest.
- Every test file has its own `beforeEach(async () => await initDb('/tmp/test-<name>.db'))` and an `afterEach` that calls `closeDb()` and unlinks the file. Each file uses a **distinct** tmp path because Vitest runs files in parallel.
- `tests/setup.ts` is **not wired up**: `vitest.config.ts` has no `setupFiles`. It also calls `initDb` without `await`. Don't rely on it. It also uses the same path as `db.test.ts` (`/tmp/test-bookshelf.db`). Wiring it up as a setup file would make the two fight over that DB file, so give one of them a different path first.
- The example in `tests/README.md` is out of date. It passes `db` into model functions and calls `initDb` synchronously. Follow the real tests in `tests/models/book.test.ts` and `tests/routes/api.test.ts` instead.
- Route tests import the `app` default export from `src/server.ts` and use `supertest`. Importing `server.ts` doesn't start listening, because of the `isMainModule` guard.

## Rules

1. **Preserve the deliberate homework gaps** unless the task is explicitly that homework:
   - the stubbed search in `src/routes/books.ts` (`GET /books/search`; `Book.searchBooks()` already exists in the model)
   - missing tests for `models/user.ts`, `models/review.ts`, `models/shelf.ts`
   - missing input validation in `src/routes/api.ts`
   - minimal styling in `src/public/css/style.css`

   Don't fill these in as a side effect of other work.
2. **All SQL goes through `all` / `get` / `run` from `src/db/index.ts` with `?` placeholders.** Never interpolate request values into SQL strings. The only interpolation allowed is a fixed column list built in code (as in `updateBook`).
3. **Relative imports in `src/` and `tests/` must end in `.js`** (e.g. `'../db/index.js'`), even when the source file is `.ts`. The package is `"type": "module"` and runs the compiled output as plain ESM.
4. **Any new non-TS file under `src/` that is read at runtime** (SQL, views, static assets) must be added to both the `copy-assets` script and the `files` array in `package.json`. Otherwise `npm start`/`npx` break even though `npm run dev` works.
5. **Keep the HTML/JSON split:** `/api/*` handlers respond with `res.json` and JSON error bodies. Non-API handlers respond with `res.render`, or with an HTML `<p class="error">` fragment for HTMX errors. Never return JSON from an HTMX endpoint.
6. **Never point tests at `./bookshelf.db`** and never reuse another test file's tmp DB path. If you edit `seed.sql`, update the tests that assert on seed counts and titles, and run `npm run test:run` before finishing.

## Repo quirks

- `bookshelf.db` is gitignored, but the stale `bookshelf.db-shm` / `bookshelf.db-wal` files (from the old better-sqlite3 setup) are still tracked. sql.js does not use WAL files. Delete `bookshelf.db` to reseed from scratch.
- `dist/` is gitignored, despite a `.gitignore` comment claiming it is committed. `bin/agent-bookshelf.js` imports `../dist/server.js`, so a build must exist before `npx agent-bookshelf`.
- The README asks for Node 24 LTS; `package.json` `engines` says `>=20`.
