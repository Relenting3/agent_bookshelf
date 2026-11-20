# SPEC: BOOK-101 · Search books by title or author

Branch `capstone/book-101`. Decisions from the 2026-11-20 interview. This file says **what** to build and how to prove it. **How** to build it goes in the planner's `tickets/BOOK-101/plan.md`.

## Outcome

A reader types in the search box on the home page and sees the books whose title or author contains the query. The same search is also available as JSON at `GET /api/books/search`. Bad input gets a clear validation error, never a 500.

## Context

- The HTML route already exists as a stub: `GET /books/search` in `src/routes/books.ts` returns a "coming soon" message. `Book.searchBooks()` in `src/models/book.ts` already exists, with no tests (see the TODO in `tests/models/book.test.ts`).
- The home page input (`src/views/books/index.ejs`) already sends `hx-get="/books/search"` with `name="q"` into `#search-results`.
- This ticket is the BOOK-101 exception in CLAUDE.md Rule 1. It fills the search gap and adds validation **for the two search endpoints only**.
- Known gotchas:
  - `/api/books/search` must be declared before `/api/books/:id`, or `:id` catches "search".
  - htmx 1.9.12 doesn't swap 4xx responses by default. The 400 error must still appear in the results area, and a later search must still work.
  - `?q=a&q=b` arrives as an array, not a string.

## Interface

### `GET /api/books/search?q=` (JSON)

| Case | Status | Body |
|---|---|---|
| Valid query, including empty, missing or whitespace-only | 200 | `Book[]` ordered by title, same shape as `GET /api/books` (`[]` when nothing matches) |
| Trimmed query over 100 characters | 400 | `{ "error": "Search query must be 100 characters or fewer" }` |
| `q` is not a single string (`?q=a&q=b`, `?q[x]=1`) | 400 | `{ "error": "Search query must be a single string" }` |

```
GET /api/books/search?q=dune      → 200  [{ "id": 16, "title": "Dune", "author": "Frank Herbert", … }]
GET /api/books/search?q=<101 × a> → 400  { "error": "Search query must be 100 characters or fewer" }
GET /api/books/search?q=a&q=b     → 400  { "error": "Search query must be a single string" }
```

### `GET /books/search?q=` (HTML fragment for HTMX)

Always HTML, never JSON. The fragment's root is the `#search-results` element, so it can replace itself.

| Case | Status | Body inside `#search-results` |
|---|---|---|
| Matches | 200 | `.book-grid` with one `.book-card` per book, the same markup as the home page |
| Empty, missing or whitespace-only `q` | 200 | All 50 cards |
| No matches | 200 | `<p class="no-results">No books match “<query>”.</p>`, with the query HTML-escaped |
| Trimmed query over 100 characters | 400 | `<p class="error">Search query must be 100 characters or fewer</p>` |
| `q` is not a single string | 400 | `<p class="error">Search query must be a single string</p>` |

```
GET /books/search?q=dune      → 200  <div id="search-results" …><div class="book-grid"><div class="book-card">… Dune …
GET /books/search?q=zzz       → 200  <div id="search-results" …><p class="no-results">No books match “zzz”.</p></div>
GET /books/search?q=<101 × a> → 400  <div id="search-results" …><p class="error">Search query must be 100 characters or fewer</p></div>
```

### Model: `searchBooks(query: string): Book[]`

Existing signature, unchanged. Same rules as the routes: it trims its input, and an empty or whitespace-only query returns all books in `getAllBooks()` order. It does not check length; the routes do.

## Behavior

- **Order of checks:** not a string → 400, then trim, then length. Exactly 100 characters is valid; 101 is an error. Length is counted in Unicode code points (`😀` counts as 1).
- **Matching:** the trimmed query is one phrase, matched as a substring of the title **or** the author. It isn't split into words.
- **Case-insensitive, including non-ASCII letters:** `MIÉVILLE` finds "China Miéville". Accents aren't stripped: `mieville` finds nothing.
- **Literal characters:** `%`, `_` and `\` in the query match themselves. They aren't wildcards.
- **Safe output:** the query only reaches the page HTML-escaped.
- **Direct browser GET** of `/books/search` returns the same fragment (no full-page version).

## Acceptance criteria

Seed facts: id 1 = "The Pragmatic Programmer"; id 16 = "Dune" (Frank Herbert); Andy Weir wrote "Project Hail Mary" and "The Martian"; id 40 = "The City & the City" (China Miéville); 50 books, first by title "1984".

| AC | Criterion |
|---|---|
| AC-1 | **Title, partial, any case:** `PRAGMATIC` and `pRaGmAtIc` return "The Pragmatic Programmer" (model and JSON route). |
| AC-2 | **Author, partial, any case:** `HERBERT` returns "Dune"; `weir` returns exactly "Project Hail Mary" and "The Martian". |
| AC-3 | **Non-ASCII case:** `MIÉVILLE` and `miéville` return "The City & the City"; `mieville` returns `[]`. |
| AC-4 | **Phrase match:** `pragmatic programmer` returns "The Pragmatic Programmer"; words found in different fields don't match. |
| AC-5 | **Order:** results are ordered by title, in the same order as `getAllBooks()`. |
| AC-6 | **No match:** `zzzz` returns 200 with `[]`. |
| AC-7 | **Empty query returns all books:** `searchBooks('')`, `searchBooks('   ')`, and the JSON route with no `q`, `q=` and `q=%20%20%20` each return 50 books, first "1984". The route isn't caught by `/api/books/:id`. |
| AC-8 | **Trimmed:** `"  dune  "` returns the same as `"dune"` on the JSON route and in `searchBooks`. |
| AC-9 | **Length limit after trimming:** 100 × `a` → 200; 101 × `a` → 400 with the length error; 100 × `a` padded with spaces → 200; 150 spaces → 200 with 50 books; 100 × `😀` → 200; 101 × `😀` → 400. |
| AC-10 | **Not a string:** `?q=a&q=b` and `?q[x]=1` → 400 with the "single string" error, never 500. |
| AC-11 | **Wildcards are literal:** `%`, `_` and `\` each return `[]`. |
| AC-12 | **Parameterised SQL:** `' OR 1=1 --` returns 200 `[]`; `'); DROP TABLE books; --` returns 200 `[]` and `GET /api/books` still returns 50 books. Code review: request values never appear in SQL text (CLAUDE.md Rule 2). |
| AC-13 | **HTML results:** `GET /books/search?q=dune` → 200, `text/html`, a `.book-card` linking to `/books/16`, not JSON. |
| AC-14 | **HTML empty query:** `q=` and no `q` → 200 with 50 `.book-card`s. |
| AC-15 | **HTML no results:** `q=zzzz` → 200 with `.no-results` showing `zzzz` and no `.book-card`. |
| AC-16 | **HTML validation errors:** 101 × `a` and `?q=a&q=b` → 400 with the matching `<p class="error">` inside `#search-results`. |
| AC-17 | **XSS:** `q=<script>alert(1)</script>` → the body contains `&lt;script&gt;` and never `<script>alert(1)`. |
| AC-18 | **HTMX wiring:** `GET /` still shows 50 cards and the input still targets `#search-results`. The `#search-results` element, on the home page and in every fragment (200 and 400), carries an `hx-on::before-swap` handler that lets 400 responses swap in. The swap itself is checked in the browser (Verification step 3). |
| AC-19 | **No regressions:** every existing test passes unchanged. |

## Constraints

- No schema changes, no new dependencies, no changes to `package.json`.
- Never touch `bookshelf.db`, `src/db/seed.sql` or `.env*`.
- Keep the interface exactly as above: routes, status codes, error messages, response shapes.
- Follow CLAUDE.md: `?` placeholders only, `.js` imports, the HTML/JSON split, the existing CSS classes and palette, own tmp DB path per test file.
- Boring is good: the smallest change that meets the criteria.

## Out of scope

- Pagination, result limits, relevance ranking
- Searching other fields (description, ISBN, year)
- Accent-insensitive matching, per-word matching, full-text search or indexes
- Author pages, UI restyle, client-side `maxlength`
- Full-page search results or bookmarkable search URLs
- Validation on any other `api.ts` endpoint; tests for the user, review and shelf models

## Files likely touched

`src/routes/books.ts`, `src/routes/api.ts`, `src/models/book.ts`, `src/views/books/index.ejs`, a new results partial under `src/views/books/`, possibly `src/db/index.ts` and `src/public/css/style.css`, and tests under `tests/`. The planner decides the rest.

## Verification path

Done means every step passes, with its output pasted as evidence. "Tests pass" on its own isn't evidence.

**1. Suite and types** (agents and the Stop gate)

```bash
npm run test:run   # 0 failed; each of AC-1…AC-19 appears in at least one test name
npx tsc --noEmit   # no output, exit 0
```

**2. API by hand** (`npm run build && npm start`, then in a second terminal)

```bash
curl -s "localhost:3000/api/books/search?q=HERBERT"          # [ … "Dune" … ]
curl -s "localhost:3000/api/books/search?q=%20%20"           # all 50 books, first "1984"
curl -s -w " %{http_code}\n" "localhost:3000/api/books/search?q=$(printf 'a%.0s' {1..101})"
                                                             # {"error":"Search query must be 100 characters or fewer"} 400
curl -s -w " %{http_code}\n" "localhost:3000/api/books/search?q=a&q=b"
                                                             # {"error":"Search query must be a single string"} 400
curl -s "localhost:3000/api/books/1"                         # still "The Pragmatic Programmer" (route order)
```

**3. In the browser, end to end** (the human, at http://localhost:3000)

- Type `weir`: 2 cards, Project Hail Mary and The Martian
- Clear the box: all 50 books
- Paste 101 characters: a red error inside the results area
- Then type `dune`: the results come back (the error swap didn't break later searches)
- Type `<script>alert(1)</script>`: shown as text, no alert

**4. Scope**

```bash
git diff --stat main...HEAD                                         # only files from "Files likely touched"
git diff main...HEAD -- src/db/seed.sql src/db/schema.sql package.json   # empty
```
