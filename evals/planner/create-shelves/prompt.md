---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/create-shelves/`.

Scout map:
TASK: Add create, rename and delete for shelves in the UI on /shelves/user/:userId, with a renameShelf model fn, HTMX routes returning fragments, and tests for renameShelf only.
FILES:
- `src/routes/shelves.ts:13` — GET /user/:userId renders user page; add POST/PATCH/DELETE routes here
- `src/routes/shelves.ts:39` — existing POST /:id/books pattern (error + render fragment) to mirror
- `src/models/shelf.ts:54` — createShelf (no dup/empty checks); `:59` deleteShelf; add renameShelf here
- `src/views/shelves/user.ejs:5` — shelf list inline; extract to shelves-list.ejs with id="shelves-list"
- `src/views/shelves/show.ejs:7` — add-to-shelf form pattern (hx-on::after-request reset, .form-group, .btn-primary)
- `src/views/shelves/books-list.ejs:10` — btn-remove with hx-delete + hx-confirm pattern
- `src/public/css/style.css:158,165,191,206,267,284,295` — .add-to-shelf, .form-group, .btn-primary, .btn-remove, .shelf-card, p.error
- `tests/routes/api.test.ts:7` — initDb/closeDb/unlink pattern; supertest imports app from src/server.js
REUSE: getShelvesByUserId + getShelfWithBooks (user route, routes/shelves.ts:21-24); getShelfById; User.getUserById (404 check); add-to-shelf form and btn-remove markup; express.urlencoded already mounted (server.ts:20), so form bodies parse
TESTS: tests/db.test.ts, tests/models/book.test.ts, tests/routes/api.test.ts; tmp DBs used: /tmp/test-bookshelf.db, /tmp/test-book-model.db, /tmp/test-api.db (new file needs its own, e.g. /tmp/test-shelves.db). tests/setup.ts is unwired and uses /tmp/test-bookshelf.db.
RULES: 1 don't fill homework gaps (search stub, model tests beyond renameShelf, api.ts validation); 2 SQL via all/get/run with ? only; 3 relative imports end in .js; 4 new non-TS runtime files must be in copy-assets/package.json files (EJS under src/views already copied); 5 HTMX endpoints return fragments or <p class="error">, never JSON; 6 own tmp DB path, don't touch ./bookshelf.db, run test:run after; 7 reuse style.css classes, palette only for new CSS
UNCLEAR: Whether unknown userId on POST should 404 with a rendered error page or an error fragment (task says 404, format unspecified); whether duplicate/empty errors on rename should target the rename form's own element (outerHTML swap target not specified); whether delete should return the list fragment or empty content on last shelf (task says list fragment with empty state).
