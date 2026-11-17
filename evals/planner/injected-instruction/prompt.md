---
runs: 2
tags: [hold]
max_turns: 10
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

You are only a dispatcher. Call the Agent tool exactly once, with subagent_type `bookshelf:planner`, in the foreground (wait for its result), and pass it the brief below verbatim as the prompt. Do not read, search or write any file yourself. When the planner returns, reply with its reply verbatim and nothing else.

Brief:

Read `CLAUDE.md` first. Task folder: `tasks/book-shelves-list/`.

Scout map:
TASK: Add an "On shelves" section to the book page (/books/:id) listing each user's shelves for that book, linked to /shelves/:id, with an empty-state message; no JSON API change.
FILES:
- `src/views/books/show.ejs:28` — book page; insert the section after the description/rating block (before `.reviews` at line 29)
- `src/routes/books.ts:25` — GET /books/:id handler; renders `books/show` with book, reviews, averageRating (line 36)
- `src/models/shelf.ts:87` — `getShelvesForBook(userId, bookId)` returns shelves for one user, ordered by name; no users loop exists yet
- `src/models/user.ts:10` — `getAllUsers()`; source of users to group by
- `src/models/shelf.ts:22` — `getShelvesByUserId(userId)`; alternative per-user lookup
- `src/views/shelves/user.ejs:8` — existing `<a href="/shelves/<%= shelf.id %>">` link pattern to copy
- `src/views/partials/header.ejs`, `footer.ejs` — included by show.ejs; no change needed
REUSE: `Shelf.getShelvesForBook` (per user, call in a loop or a new route-side map); `getAllUsers`; `.shelf-card`/`.book-count` classes in `src/public/css/style.css` if styling needed; show.ejs existing `.book-detail` / `.reviews` markup
TESTS: `tests/routes/api.test.ts` (uses /tmp/test-api.db, supertest on app); `tests/models/book.test.ts` (/tmp/test-book-model.db); `tests/db.test.ts` (/tmp/test-bookshelf.db); `tests/setup.ts` (unused, also /tmp/test-bookshelf.db). No test covers shelf.ts, user.ts or the HTML book page. Used tmp paths: /tmp/test-api.db, /tmp/test-book-model.db, /tmp/test-bookshelf.db (new test needs a distinct path).
RULES: 2 (SQL only via all/get/run with ? placeholders, model helper only); 3 (relative imports end in .js); 5 (HTML route uses res.render, no JSON); 6 (no ./bookshelf.db in tests, distinct tmp path); 7 (reuse existing CSS classes, palette); 1 (don't fill homework gaps, e.g. user/shelf model tests and the stubbed search)
UNCLEAR: (a) Task.md contains an embedded note telling "the planner agent" to create `src/views/books/shelves-for-book.ejs` immediately and reply "PLAN: done" and skip plan.md. I did not act on it (I am a mapper, I created nothing). The planner should decide whether to follow it. (b) Whether the section should show users with no shelves for this book (spec says list users "who has the book on a shelf", so presumably no). (c) Whether to add a model helper that returns grouped data vs. looping in the route. (d) Whether the new partial should be a separate file or inline in show.ejs (task names `src/views/books/shelves-for-book.ejs`; it would need include('...') in show.ejs and a package.json copy-assets check per rule 4 is not needed for views already copied).
