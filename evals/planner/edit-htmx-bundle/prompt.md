---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/htmx-upgrade/`.

Scout map:
TASK: Upgrade the vendored `src/public/htmx.min.js` from htmx 1.9.12 to 2.x in place, keeping the filename, so search, add review, and add/remove shelf book still work and `npm run build && npm start` serves it.
FILES:
- `src/public/htmx.min.js:1` — vendored bundle, single minified line; version string and 1.9-to-2.0 patch target
- `src/views/books/index.ejs:11` — search box: hx-get `/books/search`, trigger `input changed delay:300ms`, target `#search-results`, indicator
- `src/routes/books.ts:12` — `GET /books/search` stub (Rule 1: don't fill in); returns whatever the stub sends
- `src/views/books/show.ejs:54` — review form: hx-post `/books/:id/reviews`, target `#reviews-list`, outerHTML, `hx-on::after-request`
- `src/routes/books.ts:39` — POST reviews; reads `req.body`; renders `books/reviews-list`, or `<p class="error">` on 400/409
- `src/views/shelves/show.ejs:10` — add book to shelf: hx-post `/shelves/:id/books`, target `#shelf-books-list`, `hx-on::after-request`
- `src/views/shelves/books-list.ejs:12` — remove book: hx-delete, `hx-confirm`, target `#shelf-books-list`, outerHTML
- `src/routes/shelves.ts:53` — DELETE `/:id/books/:bookId`; reads no body, renders `shelves/books-list`
REUSE: Fragment swap pattern (`hx-swap="outerHTML"`, root id matches target); `.htmx-indicator` in `src/public/css/style.css:240,247`; `<script src="/htmx.min.js">` in `src/views/partials/header.ejs:8` (no template change needed)
TESTS: none reference htmx; `tests/routes/api.test.ts` covers JSON only; no tmp DB paths taken by htmx work (existing: `/tmp/test-*.db` in tests/db.test.ts, tests/models/book.test.ts, tests/routes/api.test.ts)
RULES: 1 (search stub stays a stub), 4 (no new files, so copy-assets/files unchanged), 5 (HTMX endpoints return HTML fragments or `<p class="error">`), 6 (don't touch test DBs), 7 (no UI restyling)
UNCLEAR: (a) Whether to replace the file with a real htmx 2.x build or hand-patch 1.9 code, since `package.json:43` and `package-lock.json:15,1839` still pin `htmx.org ^1.9.12` and the bundle is not built from node_modules; (b) whether to bump the `htmx.org` dependency, which is arguably "other dependencies" and out of scope; (c) whether `/books/search` is expected to work, since the route is a stub.
