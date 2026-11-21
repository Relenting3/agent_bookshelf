# Review checklist: ticket-to-merge

Shared by `reviewer-correctness`, `reviewer-security`, `reviewer-tests-rules` and `verifier`. The branch's spec, if it has one, is binding and wins over this file. Without a spec, the ticket below is the definition of done.

## The ticket (fallback spec): BOOK-101 · Search books by title or author

Acceptance criteria, as written, each with its plain meaning. Nothing beyond the plain meaning is required unless the branch's spec says so.

| # | Criterion | Plain meaning |
|---|---|---|
| T1 | A query matches title or author: partial, case-insensitive | A book is returned when the query appears anywhere in its title **or** its author. `prag` finds "The Pragmatic Programmer"; `PRAGMATIC` and `pragmatic` find the same books. |
| T2 | An empty query returns all books | No query text (empty, missing, or only spaces once trimmed) returns every book, not none. |
| T3 | Input is trimmed; over 100 characters returns a validation error | Leading and trailing spaces are removed before matching and before the length check. 100 characters after trimming is valid; 101 or more is rejected with a validation error. A crash or a 500 is never a validation error. |
| T4 | SQL is parameterised: no string-built queries | Request values reach SQL only as `?` parameters, never as part of the SQL text. |
| T5 | Vitest covers each criterion; `npm run test:run` passes | Each of T1–T4 has at least one test that would fail if that criterion broke. |

Constraints: no schema changes, no new dependencies, never touch `bookshelf.db`, `seed.sql` or `.env*`, keep the interface exactly as specified (only checkable when the branch has a spec).

The ticket leaves the interface open: endpoint, status codes, error messages and response shape are whatever the branch's spec says. Without a spec, none of them is a finding on its own.

## Areas to check

### Correctness (`reviewer-correctness`)
- Matches title **or** author, not only one of them.
- Partial (substring) match, not exact or prefix-only.
- Case-insensitive; stricter case rules (e.g. non-ASCII letters) only if the spec states them.
- Empty, missing or whitespace-only query → all books, on every route the diff adds.
- Trim happens **before** the length check and before matching.
- Length limit off by one: exactly the limit is valid, limit + 1 is the error.
- Result order, only if the spec states one (the ticket doesn't).
- A new route like `/api/books/search` declared after `/api/books/:id` is never reached.
- `q` arriving as an array (`?q=a&q=b`) or object (`?q[x]=1`) → `.trim()` on a non-string → 500.
- Status code or response shape differs from the spec.
- HTML route returns JSON, or a JSON route returns HTML, including on errors.
- Error paths: thrown errors not handled, a response sent twice, a missing `return` after `res.status(...).json(...)`.

### Security (`reviewer-security`)
- SQL text built from strings or template literals that contain request values. A value built in JS and passed as a `?` parameter is safe.
- Unescaped user data in HTML: `<%-` with request values, `res.send` with template strings, `innerHTML` in client JS.
- Validation that's missing or bypassable: type confusion (array/object `q`), length checked before trim, check on one route but not the other.
- Error responses that leak stack traces, SQL or file paths.
- Writes to protected files (`.env*`, `src/db/seed.sql`, `bookshelf.db`), new dependencies, schema changes.

### Tests and repo rules (`reviewer-tests-rules`)
- Each ticket AC has a test that would fail if the AC broke. A test named for the 100-character AC that only sends a short query doesn't count.
- Assertions that can't fail (`expect(true)`, no `expect` at all, asserting on the request instead of the response), or that pin an implementation quirk rather than the AC.
- `.skip`, `.only`, `.todo`, or commented-out tests.
- Shared or reused tmp DB paths between test files; tests pointing at `./bookshelf.db`.
- Relative imports without `.js` in `src/` or `tests/`.
- Edits to existing tests that weaken them (removed assertions, loosened expectations).
- Rules written in the branch's CLAUDE.md broken by the diff.
- Files changed outside the ticket's scope, when the spec lists the files it touches.

## Not findings (precision traps)

- `` `%${q}%` `` (or similar) built in JS and passed as a `?` parameter: safe.
- EJS `<%= %>`: it escapes. `<%- include(...) %>` of a template: safe.
- The fixed column list interpolated in `updateBook` (`src/models/book.ts`): built in code, not from the request.
- SQLite `LIKE` being case-insensitive for ASCII only, unless the spec requires non-ASCII case folding.
- `%` and `_` in the query acting as `LIKE` wildcards, unless the spec says they must be literal.
- The repo's deliberate gaps: missing validation on the other `api.ts` endpoints, no tests for the user, review and shelf models, the unused `views/layout.ejs`, the outdated `tests/setup.ts` and `tests/README.md`.
- Code the diff didn't add or change, unless the diff newly makes it reachable.
- Style, naming, formatting, refactors, missing comments, "consider…", extra tests beyond the AC.

## Repo facts (for branches without a CLAUDE.md)

- Express + TypeScript, ESM: relative imports in `src/` and `tests/` end in `.js`, even for `.ts` sources. A missing `.js` breaks the built app under plain Node ESM (`npm start`), even when Vitest resolves it.
- Database: sql.js (SQLite in WebAssembly, in memory). All SQL goes through `all()`, `get()`, `run()` from `src/db/index.ts` with `?` placeholders.
- Routers: `/` → `src/routes/books.ts` (EJS pages + HTMX fragments), `/api` → `src/routes/api.ts` (JSON only). Same model functions behind both.
- Views: EJS under `src/views/`. The existing HTMX endpoints return EJS fragments; errors in the existing code are `<p class="error">` fragments.
- HTMX 1.9.12 (vendored in `src/public/`) doesn't swap 4xx/5xx responses by default.
- Tests: Vitest + supertest on the `app` default export of `src/server.ts`. Each test file calls `initDb('/tmp/test-<name>.db')` in `beforeEach` with its **own** path (files run in parallel), and `closeDb()` + unlink in `afterEach`.
- Seed facts the tests rely on: 50 books, book id 1 = "The Pragmatic Programmer", first book by title = "1984".
- `Book.searchBooks()` existed before the ticket; `GET /books/search` was a "coming soon" stub.
