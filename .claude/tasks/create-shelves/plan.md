# Plan: Create, rename and delete shelves in the UI

Task: ./task.md

## Approach
Add `renameShelf` to `models/shelf.ts` and three HTMX routes to `routes/shelves.ts`. Each route re-renders a new
`shelves/shelves-list.ejs` fragment (root `#shelves-list`) on success and returns `<p class="error">` with 4xx on failure.
`user.ejs` includes the fragment and gets a "New shelf" form styled like the add-book form in `show.ejs`.
Each shelf card gets an inline rename form and a Delete button. Validation (trim, empty, duplicate) lives in the route, with
`?`-placeholder SQL only. Tests go in one new supertest file.

## Decisions
- Use the routes suggested in task.md unchanged: `POST /shelves/user/:userId`, `PATCH /shelves/:id`, `DELETE /shelves/:id`. They don't clash with the existing `GET /:id` or `/:id/books` routes.
- Duplicate check: the route compares the trimmed name against `getShelvesByUserId(userId)` with an exact, case-sensitive match, which is the same rule as SQLite's UNIQUE. On rename it skips the shelf's own id, so renaming a shelf to its current name succeeds. The create/rename call is also wrapped in try/catch, and a UNIQUE error becomes a 400 fragment so the server never crashes.
- 404s on these HTMX endpoints return `<p class="error">… not found</p>` fragments, not the full `error` page (rule 5).
- DELETE and PATCH read the shelf first (`getShelfById`) to get `user_id`, then re-render that user's list.
- The `renameShelf` tests go in `tests/routes/shelves.test.ts` (in their own `describe`). task.md names only that one new test file, and this keeps the `models/shelf.ts` homework gap open.
- Showing errors in the browser: htmx 1.9.12 does not swap 4xx responses by default (see Open question 1).

## Contract
- Fragment `src/views/shelves/shelves-list.ejs`, locals `{ user, shelves }` (shelves are `ShelfWithBooks[]`). Root: `<div id="shelves-list" class="shelves-list">`.
  - Each shelf renders one `.shelf-card` showing the name as a link `/shelves/<id>` and `<p class="book-count">N books</p>`.
  - Each card has a rename form `<form class="rename-shelf" hx-patch="/shelves/<id>" hx-target="#shelves-list" hx-swap="outerHTML">` with an `input[name=name]` pre-filled with the current name and a `.btn-primary` submit button.
  - Each card has a `<button class="btn-remove" hx-delete="/shelves/<id>" hx-target="#shelves-list" hx-swap="outerHTML" hx-confirm="Delete this shelf?">Delete</button>`.
  - With zero shelves it renders `<p class="empty-shelf">No shelves yet. Create one above!</p>` inside the root.
- `user.ejs` contains `<div class="add-to-shelf">` with a `<form id="new-shelf-form" hx-post="/shelves/user/<userId>" hx-target="#shelves-list" hx-swap="outerHTML" hx-on::after-request="if(event.detail.successful) this.reset()">`. The form has `.form-group`, `input#shelf-name[name=name][type=text]` and a `.btn-primary` "Create Shelf" button. The page then includes the fragment.
- `POST /shelves/user/:userId`, form body `name`:
  - 200: the fragment, containing the new name.
  - 400: `<p class="error">Shelf name is required</p>` or `<p class="error">A shelf with that name already exists</p>`.
  - 404: `<p class="error">User not found</p>`.
- `PATCH /shelves/:id`, body `name`:
  - 200: the fragment for the shelf's owner.
  - 400: the same two messages as POST.
  - 404: `<p class="error">Shelf not found</p>`.
- `DELETE /shelves/:id`:
  - 200: the fragment for the former owner, without the deleted shelf.
  - 404: `<p class="error">Shelf not found</p>`.
- All error responses have `Content-Type: text/html`, never JSON.
- Model: `renameShelf(id: number, name: string): Shelf | undefined` runs `UPDATE shelves SET name = ? WHERE id = ?` and returns the updated shelf, or `undefined` if the id doesn't exist. It does not trim or validate; that is the route's job.

## Acceptance criteria
- AC-1: POST `/shelves/user/1` with `name=  favourites  ` → 200 HTML containing `id="shelves-list"` and `favourites` (trimmed). User 1 now has 4 shelves.
- AC-2: POST with `name=` or `name=   ` → 400, body contains `<p class="error">`, not JSON. User 1 still has 3 shelves.
- AC-3: POST with an existing name for that user (e.g. `read`) → 400 error fragment. User 1 still has 3 shelves. A following request still succeeds, so the server did not crash.
- AC-4: POST `/shelves/user/9999` with a valid name → 404 error fragment.
- AC-5: PATCH `/shelves/<id of user 1's want-to-read>` with `name=wishlist` → 200 fragment containing `wishlist` and not `want-to-read`. The DB name is updated.
- AC-6: PATCH with an empty or whitespace name → 400. PATCH with another of the user's shelf names → 400. In both cases the name is unchanged.
- AC-7: PATCH a shelf to its own current name → 200.
- AC-8: PATCH `/shelves/9999` → 404 error fragment.
- AC-9: DELETE a seeded shelf that holds books → 200 fragment without that shelf name. The shelf's `shelf_books` rows are gone. The `books` count is still 50. The user's other 2 shelves are unchanged.
- AC-10: After deleting `read`, POST `name=read` for the same user → 200. A deleted shelf is not recreated automatically.
- AC-11: After deleting all 3 of a user's shelves, GET `/shelves/user/:userId` → 200 with the empty-state text and `#new-shelf-form`. A following POST still creates a shelf.
- AC-12: DELETE `/shelves/9999` → 404 error fragment.
- AC-13: GET `/shelves/user/1` → 200 and contains `#new-shelf-form`, `id="shelves-list"`, and per card `hx-patch`, `hx-delete` and `hx-confirm` (seeded shelves included).
- AC-14: `renameShelf(id, 'x')` returns a shelf with `name === 'x'`. `renameShelf(9999, 'x')` returns `undefined`.
- AC-15 (manual/CI): `npx tsc --noEmit` and `npm run test:run` pass, and the seed counts (9 shelves, 3 per user) are unchanged. `npm run build && npm start` serves `/shelves/user/1`, and `dist/views/shelves/shelves-list.ejs` exists.

## Implementation (src/ — implementer)
1. `src/models/shelf.ts`: add `renameShelf(id, name)`. Use `run` with `?` placeholders, then `getShelfById`.
2. `src/routes/shelves.ts`:
   - Add `POST /user/:userId`, `PATCH /:id` and `DELETE /:id`.
   - Add a small local helper `renderShelvesList(res, userId)`. It loads the user and `getShelvesByUserId` → `getShelfWithBooks`, then renders `shelves/shelves-list`.
   - Add a local helper for the trim/empty/duplicate check.
   - Error fragments use `res.status(4xx).send('<p class="error">…</p>')`.
3. `src/views/shelves/shelves-list.ejs` (new): the fragment described in Contract.
4. `src/views/shelves/user.ejs`: add the New shelf form and replace the inline list with `<%- include('shelves-list', { user, shelves }) %>`.
5. `src/public/css/style.css`: append minimal rules only for `.rename-shelf` (inline layout inside a card: an input with `#ddd` border and 4px radius, plus a compact button). Use only the existing palette and leave existing rules unchanged.
6. `package.json`: no change. `copy-assets` already copies `src/views/`; verify with a build.

## Tests (tests/ — test-writer)
- `tests/routes/shelves.test.ts` (tmp DB `/tmp/test-shelves-routes.db`): AC-1 to AC-14.
  - Use supertest with `.type('form')` for bodies.
  - Read DB state via `all`/`get` from `src/db/index.js` or the shelf model getters.
  - Find seeded shelf ids by querying `shelves` by `user_id` and `name`; don't hard-code ids.

## Out of scope
- Everything in task.md's Out of scope: the `/api` endpoints and `api.ts` validation, `models/shelf.ts` tests other than `renameShelf`, restyling, persistence/`saveDb`, auth, other shelf features, the `books-list.ejs` id bug, and search.
- Case-insensitive duplicate detection and a name length limit (task.md doesn't ask for them).

## Open questions
1. htmx 1.9.12 does not swap 400/404 responses, so error fragments are invisible in the browser unless something handles them. How should they be shown?
   Recommended (used in the plan): add an inline `hx-on::before-swap` on the new form, each rename form and each Delete button. For 4xx it sets `shouldSwap = true` and retargets to a nearby error slot: `#new-shelf-error` under the form, or a `.shelf-error` div in the card (each card's div needs a unique id, e.g. `shelf-error-<id>`, to be a target). The list stays intact.
   · Alternatives: a global `htmx:beforeSwap` listener in a new `src/public/js` file (needs a copy-assets/`files` update, rule 4) | don't show errors, the same as the existing add-book form.
2. Empty-state wording when a user has no shelves.
   Recommended (used in the plan): `No shelves yet. Create one above!` in `p.empty-shelf`. · Alternative: reuse the wording of `books-list.ejs`'s empty message.
