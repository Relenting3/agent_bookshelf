# Plan: BOOK-101: Search books by title or author

**Exception: BOOK-101** (branch `capstone/book-101`, spec in `SPEC.md`) fills the search gap and adds input validation for the search endpoints only. The other gaps stay: no tests for the other models, no validation on the rest of `api.ts`.
Spec: SPEC.md

## Approach
`initDb()` registers a Unicode-aware SQL function `ulower(x)` on every new sql.js `Database` it creates. `Book.searchBooks()` keeps its signature: it trims the query, returns `getAllBooks()` when the query is empty, and otherwise runs one `all()` query with `instr(ulower(title), ulower(?)) > 0 OR instr(ulower(author), ulower(?)) > 0 ORDER BY title`. The trimmed query is passed only as a bound `?` parameter (Rule 2). `instr` matches substrings literally, so `%`, `_` and `\` need no escaping. `ulower` folds `É` → `é`, which the built-in `LOWER`/`LIKE` can't do (ASCII only, no ICU).
Both routes share one validator, `parseSearchQuery`, exported from `models/book.ts`. The HTML route renders a new partial `books/search-results` whose root is `#search-results`. `index.ejs` includes the same partial, so the home page and the fragments use one card markup and one `hx-on::before-swap` handler.

## Decisions
- Matching runs in SQL through a `ulower` UDF (human's answer to Q1) — it stays in SQL, folds non-ASCII case, and `instr` avoids LIKE patterns and `ESCAPE`.
- The UDF is registered inside `initDb()`, right after `db = new SQL.Database(...)` (both branches) and before the schema and seed run. sql.js functions belong to one `Database` instance and aren't saved in the file, so each `initDb()` (every test `beforeEach`, and the server start) must register it again. Registering it in one place after the `if/else` covers both branches.
- `ulower` is `(x) => x == null ? null : String(x).toLowerCase()`. `toLowerCase()`, not `toLocaleLowerCase()`: the result doesn't depend on the server locale. No accent stripping and no Unicode normalisation (spec: out of scope).
- The query string never appears in SQL text: the SQL is a fixed literal and the same trimmed value is bound twice (`[q, q]`). The function name `ulower` is a fixed identifier in code.
- `parseSearchQuery` lives in `src/models/book.ts` (human's answer to Q2).
- Length is counted as `[...trimmed].length` (code points), so `😀` counts as 1. JS `.length` counts UTF-16 units and would reject 51 emoji.
- Trimming uses `String.prototype.trim()` in both the validator and `searchBooks`.
- Validation order follows the spec: `typeof raw === 'string'` or `undefined`, else single-string error; then trim; then length. Missing `q` is treated as `''`. Express 4 uses `qs`, so `?q[x]=1` arrives as an object and `?q=a&q=b` as an array; both hit the type check.
- The input gets `hx-swap="outerHTML"`, because the fragment root is `#search-results` and replaces itself. With the default `innerHTML` the element would nest.
- The `hx-on::before-swap` handler goes on `#search-results` inside the partial, so every 200 and 400 fragment and the home page carry it. htmx fires `htmx:beforeSwap` on the target, so the handler sees it. For status 400 it sets `event.detail.shouldSwap = true` and `event.detail.isError = false`.
- Every `res.render` of the partial passes `books`, `query` and `error` (EJS throws on undefined locals).
- No CSS change: `p.error` already exists. `.no-results` stays unstyled (plain paragraph). `.search-message` is left in place.
- No `package.json` or schema change. The new file is `.ejs` under `views/`, which is already copied whole (Rule 4).

## Contract
Routes, statuses, bodies and error strings: exactly as SPEC.md Interface. Additions:

- `src/db/index.ts`
  - after each `initDb()`, the SQL function `ulower(x)` exists: text → JS `toLowerCase()` of it, `NULL` → `NULL`. E.g. `get("SELECT ulower('MIÉVILLE') AS v")` → `{ v: 'miéville' }`.
  - `initDb`, `closeDb`, `all`, `get`, `run` signatures unchanged.
- `src/models/book.ts`
  - `searchBooks(query: string): Book[]` (unchanged signature, behaviour per spec)
  - SQL shape: `SELECT * FROM books WHERE instr(ulower(title), ulower(?)) > 0 OR instr(ulower(author), ulower(?)) > 0 ORDER BY title`, params `[q, q]`
  - `export const SEARCH_MAX_LENGTH = 100`
  - `export function parseSearchQuery(raw: unknown): { ok: true; query: string } | { ok: false; error: string }`
    - `raw` is `undefined` → `{ ok: true, query: '' }`
    - not a string → `{ ok: false, error: 'Search query must be a single string' }`
    - trimmed over 100 code points → `{ ok: false, error: 'Search query must be 100 characters or fewer' }`
    - otherwise → `{ ok: true, query: <trimmed> }`
- `GET /api/books/search` is declared in `src/routes/api.ts` before `GET /books/:id`. `Content-Type: application/json`.
- `GET /books/search`: `Content-Type: text/html`, rendered via `res.render('books/search-results', { books, query, error })`, with status 400 when `error` is set.
- Partial `src/views/books/search-results.ejs`, locals `books: Book[]`, `query: string`, `error: string | null`:
  - root: `<div id="search-results" hx-on::before-swap="…400 → shouldSwap=true; isError=false…">`
  - `error` set → `<p class="error"><%= error %></p>` only
  - else `books.length === 0` → `<p class="no-results">No books match “<%= query %>”.</p>`
  - else `<div class="book-grid">` + one `.book-card` per book (the current markup from `index.ejs`, with a link `/books/<id>`)
  - every value goes through `<%= %>` (escaped); no `<%-` for request data
- `index.ejs`: the input keeps `hx-get="/books/search"`, `name="q"`, `hx-target="#search-results"`, and adds `hx-swap="outerHTML"`. The inline results block is replaced by `<%- include('search-results', { books, query: '', error: null }) %>`.

## AC → test map
- AC-1 → model + route files → "AC-1: searchBooks matches title in any case", "AC-1: API search matches title in any case"
- AC-2 → model + route → "AC-2: searchBooks matches author HERBERT", "AC-2: API search weir returns exactly two books"
- AC-3 → model + route → "AC-3: ulower is registered after every initDb", "AC-3: searchBooks folds non-ASCII case", "AC-3: API search mieville without accent returns []"
- AC-4 → model → "AC-4: phrase matches within one field", "AC-4: words split across title and author don't match"
- AC-5 → model → "AC-5: results ordered as in getAllBooks"
- AC-6 → route → "AC-6: API search zzzz returns 200 []"
- AC-7 → model + route → "AC-7: searchBooks empty and whitespace return all 50", "AC-7: API search without q, q= and q=spaces returns 50, first 1984"
- AC-8 → model + route → "AC-8: searchBooks trims the query", "AC-8: API search trims the query"
- AC-9 → validator + route → "AC-9: parseSearchQuery length limit after trim (100/101, padded, spaces, emoji)", "AC-9: API search length limit returns 200/400"
- AC-10 → validator + route → "AC-10: parseSearchQuery rejects arrays and objects", "AC-10: API search q=a&q=b and q[x]=1 return 400"
- AC-11 → model + route → "AC-11: percent, underscore and backslash are literal"
- AC-12 → route → "AC-12: SQL injection strings return [] and books table intact" · left to the human: code review that the query only reaches SQL as a bound `?` parameter
- AC-13 → HTML file → "AC-13: HTML search dune returns html card linking /books/16"
- AC-14 → HTML → "AC-14: HTML search with q= and no q returns 50 cards"
- AC-15 → HTML → "AC-15: HTML search zzzz shows no-results and no cards"
- AC-16 → HTML → "AC-16: HTML search returns 400 error fragments inside #search-results"
- AC-17 → HTML → "AC-17: HTML search escapes script query"
- AC-18 → HTML → "AC-18: home page has 50 cards and input targets #search-results", "AC-18: home and fragments carry hx-on::before-swap on #search-results" · left to the human: the browser swap of a 400 and a later search (Verification step 3)
- AC-19 → `npm run test:run` with the existing test files untouched → no new test · left to the human/reviewer: `git diff` shows no edits under the existing `tests/*.test.ts`

## Implementation (src/ — implementer)
1. `src/db/index.ts`: in `initDb()`, after the `if/else` that creates `db` (line 27) and before `PRAGMA`/schema, call `db.create_function('ulower', …)` per Contract. Nothing else changes.
2. `src/models/book.ts`: add `SEARCH_MAX_LENGTH` and `parseSearchQuery`. Rewrite the body of `searchBooks`: trim; if empty return `getAllBooks()`; else `all(<SQL shape>, [q, q])`. Remove the LIKE query and the `%${query}%` pattern.
3. `src/routes/api.ts`: add `router.get('/books/search', …)` between `/books` (line 10) and `/books/:id` (line 15). Call `parseSearchQuery(req.query.q)`; on failure `res.status(400).json({ error })`, else `res.json(Book.searchBooks(query))`. No other handler changes.
4. `src/routes/books.ts`: replace the stub (lines 12–23). Same parse; on failure `res.status(400).render('books/search-results', { books: [], query: '', error })`, else render with `{ books: Book.searchBooks(query), query, error: null }`.
5. `src/views/books/search-results.ejs` (new): the partial per Contract.
6. `src/views/books/index.ejs`: add `hx-swap="outerHTML"` to the input; replace lines 19–31 with the include.

## Tests (tests/ — test-writer)
- `tests/models/book-search.test.ts` (tmp DB `/tmp/test-book-search.db`): AC-1, AC-2, AC-3 (incl. `ulower` via `get()` after `closeDb()` + a second `initDb()` on the same path), AC-4, AC-5, AC-7, AC-8, AC-9 and AC-10 (`parseSearchQuery`), AC-11
- `tests/routes/search-api.test.ts` (tmp DB `/tmp/test-search-api.db`): AC-1, AC-2, AC-3, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12
- `tests/routes/search-html.test.ts` (tmp DB `/tmp/test-search-html.db`): AC-13 through AC-18
- Same `beforeEach`/`afterEach` as `tests/routes/api.test.ts`. Count cards with a regex on `class="book-card"`. Don't edit the existing test files; the TODO in `tests/models/book.test.ts` stays.

## Out of scope
- Everything under the spec's Out of scope; validation on other `api.ts` routes; tests for the user, review and shelf models
- Removing the now-unused `.search-message` CSS; styling `.no-results`; Unicode normalisation (NFC/NFD) of the query
- Using `ulower` anywhere other than `searchBooks`

## Open questions
None. Answered: Q1 (matching via the `ulower` UDF in SQL) and Q2 (`parseSearchQuery` in `models/book.ts`) are recorded under Decisions.
