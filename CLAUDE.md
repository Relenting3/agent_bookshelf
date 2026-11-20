# CLAUDE.md

Agent Bookshelf is a Goodreads-lite app used as a **teaching playground for an AI-agents course**. It has **deliberate gaps** (see Rules). Stack: Express + TypeScript (ESM), SQLite via **sql.js** (WebAssembly, in memory), EJS views, HTMX, Vitest. Rationale: `docs/adr/001-architecture.md`.

## Commands

```bash
npm run test:run                                  # vitest single run: the verification command
npx tsc --noEmit                                  # typecheck (no linter)
npx vitest run tests/routes/api.test.ts -t "name" # one file / one test
npm run dev                                       # tsx watch → http://localhost:3000
npm run build && npm start                        # tsc + copy-assets → dist/, then node dist/server.js
```

## Architecture

`src/server.ts` mounts four routers. HTML and JSON routes call the same model functions (no service layer). Importing `server.ts` doesn't start listening.

| Mount | File | Returns |
|---|---|---|
| `/` | `routes/books.ts` | EJS pages + HTMX fragments |
| `/shelves` | `routes/shelves.ts` | EJS pages + HTMX fragments |
| `/reviews` | `routes/reviews.ts` | EJS page |
| `/api` | `routes/api.ts` | JSON only |

- **DB (`src/db/index.ts`)**: a module-level sql.js singleton. `initDb(path?)` loads `./bookshelf.db` (cwd) or `path`, runs `schema.sql`, seeds if `users` is empty, then saves. `all()`, `get()`, `run()` wrap prepared statements. Writes stay in memory until `saveDb()` / `closeDb()`.
- **Models (`src/models/*.ts`)**: plain exported functions, no db argument. Rows are snake_case (`cover_url`, `published_year`), cast with `as unknown as T`.
- **Views**: pages `include` `partials/header` and `partials/footer` (`views/layout.ejs` is unused). An HTMX endpoint renders a fragment template whose root id matches the `hx-target`. htmx 1.9.12 is vendored in `src/public/`; by default it does not swap 4xx/5xx responses.
- **Seed**: 50 books, 3 users, 9 shelves, some reviews. Tests assert on it (book id 1 = "The Pragmatic Programmer", first by title = "1984").

## Testing

- One file per layer: `tests/db.test.ts` (schema/seed via `all('SELECT COUNT(*) ...')`), `tests/models/book.test.ts` (models), `tests/routes/api.test.ts` (HTTP with supertest on the `app` default export of `src/server.ts`).
- Each file has `beforeEach(async () => await initDb('/tmp/test-<name>.db'))` and an `afterEach` that calls `closeDb()` and unlinks the file. Every file uses its **own** tmp path (Vitest runs files in parallel).
- Copy the real test files. Ignore `tests/setup.ts` (not wired up, `initDb` not awaited, same path as `db.test.ts`) and the outdated example in `tests/README.md`.

## Rules

1. **Preserve the deliberate homework gaps** unless the task is explicitly that homework:
   - the stubbed search in `src/routes/books.ts` (`GET /books/search`; `Book.searchBooks()` already exists)
   - missing tests for `models/user.ts`, `models/review.ts`, `models/shelf.ts`
   - missing input validation in `src/routes/api.ts`

   Don't fill these in as a side effect of other work.
   **Exception: BOOK-101** (branch `capstone/book-101`, spec in `SPEC.md`) fills the search gap and adds input validation for the search endpoints only. The other gaps stay: no tests for the other models, no validation on the rest of `api.ts`.
2. **All SQL goes through `all` / `get` / `run` with `?` placeholders.** Never interpolate request values into SQL strings. The only allowed interpolation is a fixed column list built in code (as in `updateBook`).
3. **Relative imports in `src/` and `tests/` end in `.js`** (e.g. `'../db/index.js'`), even for `.ts` sources.
4. **A new non-TS runtime file under `src/`** outside `views/` and `public/` (those are copied whole) must be added to the `copy-assets` script and the `files` array in `package.json`.
5. **Keep the HTML/JSON split:** `/api/*` handlers respond with `res.json` and JSON error bodies. Other handlers use `res.render`, or an HTML `<p class="error">` fragment for HTMX errors. Never return JSON from an HTMX endpoint.
6. **Protected files:** never modify `bookshelf.db`, `src/db/seed.sql` or any `.env*` file, and never read `.env*`. Tests never point at `./bookshelf.db` or another file's tmp path.
7. **New UI reuses the existing design:** classes in `src/public/css/style.css` (`.form-group`, `.btn-primary`, `p.error`, card classes) and its palette (`#2c3e50`, `#3498db`, `#e74c3c`, `#ddd` borders, 4px/8px radii). Don't restyle existing pages.

## Repo quirks

- `bookshelf.db` is gitignored; the stale `bookshelf.db-shm` / `-wal` files are tracked but unused. To reseed, the human deletes `bookshelf.db`.
- `dist/` is gitignored; `bin/agent-bookshelf.js` needs a build first.
