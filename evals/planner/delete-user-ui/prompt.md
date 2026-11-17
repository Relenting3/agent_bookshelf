---
runs: 2
tags: [act]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground with `run_in_background: false` (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/delete-user/`.

Scout map:
TASK: Add a Delete button with confirm on each user card on /shelves; delete the user plus their shelves, shelf_books and reviews; refresh the list via HTMX; unknown user returns 404 with an error message in the page; empty-state message when no users remain. JSON API unchanged.
FILES:
- `src/routes/shelves.ts:8` — GET /shelves renders `shelves/index` with users; no delete route exists here yet
- `src/views/shelves/index.ejs:5` — `.users-list` grid of `.user-card`s; no button, no root id, no empty state
- `src/models/user.ts:50` — `deleteUser()` runs only `DELETE FROM users`; related rows rely on FK cascade
- `src/db/schema.sql:24,33,44` — ON DELETE CASCADE: shelves→users, shelf_books→shelves, reviews→users
- `src/routes/shelves.ts:18` — 404 pattern is `res.status(404).render('error', {message})` (full page); HTMX errors must be a `<p class="error">` fragment
- `src/views/shelves/books-list.ejs:10-18` — existing HTMX Remove button pattern (hx-delete, hx-target, hx-swap outerHTML, hx-confirm)
- `src/routes/api.ts:98-107` — JSON DELETE /api/users/:id; must stay unchanged
- `src/public/css/style.css:206,267,284,295` — `.btn-remove`, `.user-card`, `.error`, `p.error`
REUSE: `User.deleteUser` and `User.getAllUsers` (models/user.ts); `.btn-remove` plus hx-confirm pattern from books-list.ejs; `p.error` for HTMX errors; `.empty-shelf` (style.css:152) as empty-state style to copy; `.users-list` grid as the swap target wrapper
TESTS: `tests/routes/api.test.ts` (supertest, /tmp/test-api.db); `tests/models/book.test.ts` (/tmp/test-book-model.db); `tests/db.test.ts` (/tmp/test-bookshelf.db); `tests/setup.ts` is unwired and also uses /tmp/test-bookshelf.db. No tests cover routes/shelves.ts or models/user.ts (homework gap). Used tmp paths: /tmp/test-api.db, /tmp/test-book-model.db, /tmp/test-bookshelf.db; any new test needs a fresh path.
RULES: 1 keep homework gaps (don't add user model/route tests as a side effect); 2 SQL only via all/get/run with ? placeholders; 3 relative imports end in .js; 4 only if a new non-TS file is added (none expected); 5 HTMX endpoint returns HTML fragment, never JSON; 6 never use ./bookshelf.db, unique tmp path; 7 reuse existing CSS classes, no restyling.
UNCLEAR: (1) whether to rely on FK cascade or delete child rows explicitly (PRAGMA foreign_keys = ON is set at init; verify it applies); (2) the 404 message: full error page or an HTML fragment swapped into the list (fragment seems required for HTMX); (3) empty-state wording and whether the list needs a root id like `#users-list` for the outerHTML swap (none exists yet); (4) whether the DELETE route goes in routes/shelves.ts or elsewhere.
