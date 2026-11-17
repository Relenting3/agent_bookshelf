---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/shelf-add-feedback/`.

Scout map:
TASK: Make `POST /shelves/:id/books` return JSON (added/message/books), have the shelf page show the message for a few seconds and re-render the list from `books`, and return 400 JSON `{error}` when `bookId` is missing.

FILES:
- `src/routes/shelves.ts:39-51` — POST handler; currently renders `shelves/books-list` and sends HTML 400 for missing bookId.
- `src/views/shelves/show.ejs:9-14` — "Add to Shelf" form; hx-post, hx-target `#shelf-books-list`, hx-swap outerHTML.
- `src/views/shelves/show.ejs:28-30` — `#shelf-books-list` wrapper that includes the list partial.
- `src/views/shelves/books-list.ejs:1` — list fragment; root is an unnamed `div.shelf-books`, no id; uses `shelf.books`.
- `src/models/shelf.ts:33` — `getShelfWithBooks` (returns `books` for the JSON response).
- `src/models/shelf.ts:64-77` — `addBookToShelf` returns false when already present (drives `added`).
- `src/public/css/style.css:284-295` — existing `.error` / `p.error` styles; no success/message class found.
- `tests/routes/api.test.ts` — only route test file; no tests cover `/shelves` HTML routes.

REUSE: `Shelf.addBookToShelf` / `Shelf.getShelfWithBooks`; `hx-on::after-request="if(event.detail.successful) this.reset()"` pattern (show.ejs:13); `books-list` partial via `include`.

TESTS: `tests/routes/api.test.ts` (uses `/tmp/test-api.db`), `tests/models/book.test.ts` (`/tmp/test-book-model.db`), `tests/db.test.ts` (`/tmp/test-bookshelf.db`), `tests/setup.ts` (unwired, also `/tmp/test-bookshelf.db`). Use a new distinct `/tmp/test-*.db` path for any new shelf route test.

RULES:
- 1 — keep homework gaps; don't add `/api` validation or search.
- 2 — SQL only via `all`/`get`/`run` with `?`.
- 3 — relative imports end in `.js`.
- 5 — HTML/JSON split: `/api/*` is JSON; HTMX endpoint must not return JSON. This task explicitly asks for JSON from an HTMX endpoint, so flag it for the planner.
- 6 — never point tests at `./bookshelf.db`; use a distinct tmp path.
- 7 — reuse `style.css` classes; new message styling must use existing palette.

UNCLEAR:
- Conflict with CLAUDE.md rule 5: the task requires JSON from an HTMX endpoint, which the rule forbids. Planner should confirm the exception.
- Duplicate add: task says "list is unchanged" but the JSON `added: false` response has no `books`. Confirm the page leaves the list as-is rather than re-rendering.
- Current `books-list.ejs` root has no `id`, and the swap replaces the `#shelf-books-list` wrapper, so a re-render from JSON needs a client-side renderer or the id must be kept in place. Confirm the approach.
- Whether the "few seconds" message auto-hides and where its element lives (no existing message element on show.ejs).
- Whether a 400 should keep HTML error handling for the form. The task says JSON.
