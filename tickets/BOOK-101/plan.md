# Plan: BOOK-101: Search books by title or author

Exception (CLAUDE.md Rule 1): "BOOK-101 (branch `capstone/book-101`, spec in `SPEC.md`) fills the search gap and adds input validation for the search endpoints only. The other gaps stay: no tests for the other models, no validation on the rest of `api.ts`."
Spec: SPEC.md

## Approach
- `initDb()` registers a JS scalar function `ulower(text)` (via sql.js `db.create_function`) on every new `Database`, which returns `String.prototype.toLowerCase()` of its argument. sql.js's built-in `lower()`/`LIKE` fold ASCII only.
- `searchBooks()` trims, returns `getAllBooks()` for an empty query, and otherwise runs one parameterized query: `instr(ulower(title), ?) > 0 OR instr(ulower(author), ?) > 0 ORDER BY title`, bound to the JS-lowercased query. `instr` has no wildcards, so `%`/`_`/`\` are literal, and request values only ever reach SQL as `?` parameters.
- One shared validator, `parseSearchQuery(raw: unknown)` in `src/models/book.ts`, checks type, then trims, then checks the code-point length. Both routes use it.
- `GET /api/books/search` is declared above `/books/:id` in `api.ts`. `GET /books/search` renders a new partial `books/search-results`, whose root is `#search-results` and carries the `hx-on::before-swap` handler. The home page includes that partial, and the input gets `hx-swap="outerHTML"` so a fragment replaces the element instead of nesting inside it.

## Decisions
- Matching uses a JS `ulower()` registered in sql.js plus `instr` (human's answer to Q1). The name `ulower`, not `lower`, so the built-in `lower()` is not shadowed for other SQL. It must be registered inside `initDb()` after each `new SQL.Database(...)`, because functions aren't stored in the DB file and tests call `initDb` before every test. A non-string argument (NULL) returns `null`.
- `src/db/index.ts` is in the spec's "Files likely touched" list ("possibly"). No change to its exported API, and `schema.sql`/`seed.sql` stay untouched.
- Validation lives in a separate exported function, not in `searchBooks`. The spec says the model trims but doesn't check length.
- `parseSearchQuery` goes in `src/models/book.ts` (human's answer to Q2).
- Express 4 uses the `qs` parser, so `?q=a&q=b` gives an array and `?q[x]=1` gives an object. Both fail `typeof raw === 'string'`. A missing `q` (`undefined`) counts as `''`.
- Length is `[...trimmed].length` (code points), and the limit is 100 inclusive.
- `hx-swap="outerHTML"` on the input is needed because the spec says the fragment root is `#search-results` and replaces itself.
- `.no-results` gets no CSS rule (human's answer to Q3); `style.css` is not touched.
- New tests go in 3 new files. The existing test files and their TODOs stay untouched (no edits to existing tests).

## Contract
Routes, statuses, bodies and error strings are exactly as in the spec's Interface. Additions:
- `src/db/index.ts`: after the `Database` is created in `initDb`, `db.create_function('ulower', (s: unknown) => typeof s === 'string' ? s.toLowerCase() : null)`. Exports unchanged.
- `src/models/book.ts`
  - `searchBooks(query: string): Book[]`: unchanged signature. SQL shape: `SELECT * FROM books WHERE instr(ulower(title), ?) > 0 OR instr(ulower(author), ?) > 0 ORDER BY title`, params `[q, q]` where `q = query.trim().toLowerCase()`.
  - `export type SearchQueryResult = { ok: true; query: string } | { ok: false; error: string }`
  - `export function parseSearchQuery(raw: unknown): SearchQueryResult`
    - not a string (and not undefined) → `{ ok: false, error: 'Search query must be a single string' }`
    - trimmed length > 100 code points → `{ ok: false, error: 'Search query must be 100 characters or fewer' }`
    - otherwise → `{ ok: true, query: <trimmed> }` (`undefined` → `''`)
- Partial `src/views/books/search-results.ejs`, locals `{ books: Book[], query: string, error: string | null }`:
  - root: `<div id="search-results" hx-on::before-swap="if (event.detail.xhr.status === 400) { event.detail.shouldSwap = true; event.detail.isError = false; }">`
  - error set → `<p class="error"><%= error %></p>`
  - else if `books.length === 0` → `<p class="no-results">No books match “<%= query %>”.</p>` (escaped with `<%=`)
  - else → `.book-grid` holding the existing `.book-card` markup (moved from index.ejs:20-30)
- `GET /books/search`: `res.render('books/search-results', …)`, `text/html`, with `res.status(400)` on validation failure. Never JSON.
- `GET /api/books/search`: `res.json(books)`, or `res.status(400).json({ error })`.
- Home page `#search-results` comes from the same partial, so it carries the same `hx-on::before-swap` attribute.

## AC → test map
- AC-1 → `tests/models/book-search.test.ts` → "AC-1: searchBooks matches title partial in any case"; `tests/routes/search-api.test.ts` → "AC-1: JSON route matches PRAGMATIC and pRaGmAtIc"
- AC-2 → `book-search.test.ts` → "AC-2: HERBERT returns Dune", "AC-2: weir returns exactly Project Hail Mary and The Martian"; `search-api.test.ts` → "AC-2: JSON route matches author"
- AC-3 → `book-search.test.ts` → "AC-3: MIÉVILLE and miéville return The City & the City", "AC-3: mieville returns []"; `search-api.test.ts` → "AC-3: JSON route non-ASCII case"
- AC-4 → `book-search.test.ts` → "AC-4: pragmatic programmer matches as a phrase", "AC-4: words split across title and author don't match" (e.g. `dune herbert` → [])
- AC-5 → `book-search.test.ts` → "AC-5: results follow getAllBooks() order"
- AC-6 → `search-api.test.ts` → "AC-6: zzzz returns 200 []"
- AC-7 → `book-search.test.ts` → "AC-7: empty and whitespace queries return all 50, first 1984"; `search-api.test.ts` → "AC-7: no q, q= and q=%20%20%20 return 50 books, first 1984"
- AC-8 → `book-search.test.ts` → "AC-8: '  dune  ' equals 'dune'"; `search-api.test.ts` → "AC-8: JSON route trims"
- AC-9 → `search-api.test.ts` → "AC-9: 100 a → 200", "AC-9: 101 a → 400 length error", "AC-9: padded 100 a → 200", "AC-9: 150 spaces → 50 books", "AC-9: 100 😀 → 200", "AC-9: 101 😀 → 400"
- AC-10 → `search-api.test.ts` → "AC-10: q=a&q=b → 400 single string", "AC-10: q[x]=1 → 400 single string"
- AC-11 → `book-search.test.ts` and `search-api.test.ts` → "AC-11: % _ and \\ each return []"
- AC-12 → `search-api.test.ts` → "AC-12: ' OR 1=1 -- returns []", "AC-12: DROP TABLE payload returns [] and /api/books still has 50" · left to the human: code review that request values never reach SQL text
- AC-13 → `tests/routes/search-html.test.ts` → "AC-13: q=dune returns text/html with a card linking to /books/16"
- AC-14 → `search-html.test.ts` → "AC-14: q= and no q return 50 .book-card"
- AC-15 → `search-html.test.ts` → "AC-15: q=zzzz shows .no-results with zzzz and no cards"
- AC-16 → `search-html.test.ts` → "AC-16: 101 a → 400 length error inside #search-results", "AC-16: q=a&q=b → 400 single-string error inside #search-results"
- AC-17 → `search-html.test.ts` → "AC-17: script query is escaped"
- AC-18 → `search-html.test.ts` → "AC-18: GET / shows 50 cards and input targets #search-results", "AC-18: #search-results carries hx-on::before-swap on home page, 200 and 400 fragments" · left to the human: the swap in the browser (Verification step 3)
- AC-19 → `search-api.test.ts` → "AC-19: GET /api/books/1 still returns The Pragmatic Programmer" · left to the human: full `npm run test:run` passes, and `git diff` shows the existing test files unchanged

## Implementation (src/ — implementer)
1. `src/db/index.ts`: in `initDb`, right after the `db = new SQL.Database(...)` branch (before `PRAGMA`), register `ulower` with `db.create_function` as in the Contract. Nothing else changes.
2. `src/models/book.ts`: rewrite the body of `searchBooks`: trim, return `getAllBooks()` for an empty query, otherwise `all()` with the `instr(ulower(...), ?)` SQL from the Contract and the JS-lowercased query bound twice. Add `SearchQueryResult` and `parseSearchQuery` as in the Contract.
3. `src/routes/api.ts`: add `router.get('/books/search', …)` between `GET /books` (line 10) and `GET /books/:id` (line 15). It calls `Book.parseSearchQuery(req.query.q)`, then 400 JSON or `res.json(Book.searchBooks(result.query))`.
4. `src/routes/books.ts`: replace the stub at :12-23. Same validation, then `res.status(400).render('books/search-results', { books: [], query: '', error })` or `res.render('books/search-results', { books, query, error: null })`. Keep it above `/books/:id`.
5. `src/views/books/search-results.ejs` (new; `views/` is copied whole, so no `package.json` change): the partial as in the Contract.
6. `src/views/books/index.ejs`: replace lines 19-31 with `<%- include('search-results', { books, query: '', error: null }) %>`. Add `hx-swap="outerHTML"` to the input and leave the other attributes alone.

## Tests (tests/ — test-writer)
Copy the setup from `tests/routes/api.test.ts` (beforeEach `initDb(path)`, afterEach `closeDb()` + unlink), with `.js` imports.
- `tests/models/book-search.test.ts` (tmp DB `/tmp/test-book-search.db`): AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-11
- `tests/routes/search-api.test.ts` (tmp DB `/tmp/test-search-api.db`): AC-1, AC-2, AC-3, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-19
- `tests/routes/search-html.test.ts` (tmp DB `/tmp/test-search-html.db`): AC-13, AC-14, AC-15, AC-16, AC-17, AC-18
- Build the query strings with supertest `.query()` or `encodeURIComponent`. Send `?q=a&q=b` and `?q[x]=1` as raw paths. Count cards with a regex on `class="book-card"`.
- AC-3 tests must go through `initDb` (as all tests do), so they also exercise the `ulower` registration.
- Optional extra unit tests for `parseSearchQuery`, named under the AC-9/AC-10 prefixes.

## Out of scope
- Everything in the spec's Out of scope: pagination/ranking, other fields, accent-insensitive or per-word matching, FTS, restyling, client `maxlength`, full-page results, validation on other `api.ts` endpoints, tests for the user/review/shelf models.
- Edits to the existing test files (including filling the TODO in `tests/models/book.test.ts`), `schema.sql`, `seed.sql`, `package.json`, `src/public/css/style.css`.
- Overriding the built-in SQL `lower()`.

## Open questions
None.
