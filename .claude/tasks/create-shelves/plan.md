# Plan: Create, rename and delete shelves in the UI

Task: ./task.md

## Approach
Add `renameShelf` to `models/shelf.ts` and three HTMX routes to `routes/shelves.ts` (create, rename, delete).
The shelf cards in `user.ejs` move into a new fragment `shelves/shelves-list.ejs` (root `#shelves-list`).
Every success response re-renders that fragment; every error is a 4xx `<p class="error">` fragment.
htmx 1.9.12 does not swap 4xx responses, so `user.ejs` adds one `hx-on::before-swap` handler on a page wrapper
that writes error fragments into a `#shelf-error` slot and clears it on success. No new runtime files outside `src/views/`.

## Decisions
- Validation (trim, empty, duplicate) lives in the route. `renameShelf` does no validation, like `createShelf`.
- Duplicate check: the route compares the trimmed name against `getShelvesByUserId(userId)`, excluding the shelf being renamed. A try/catch around the model call also maps a UNIQUE error to 400, so the server never crashes.
- Duplicate match is exact (case-sensitive), same as SQLite's `UNIQUE(user_id, name)`. Human-confirmed (was Q2).
- Error display: one `hx-on::before-swap` handler on a `#shelves-page` wrapper writes error fragments into `#shelf-error`. Human-confirmed (was Q1). No new static files, so no `response-targets` extension.
- `renameShelf` tests go in `tests/routes/shelves.test.ts` (own `describe('renameShelf')`), not in `tests/models/shelf.test.ts`. That file stays uncreated because it is a homework gap (CLAUDE.md rule 1). Human decision (was Q3).
- Error messages are fixed strings and never echo the submitted name, so no user input is reflected unescaped.
- Delete looks up the shelf first (`getShelfById`) to get `user_id` for the re-render and to return 404.
- A local helper in `routes/shelves.ts` builds the shelves-with-books list (same code as the GET handler) for both the page and the fragment.
- No `package.json` change: `copy-assets` already copies all of `src/views/` and `src/public/` (checked).

## Contract
Routes (all under `/shelves`, form-urlencoded body, responses `text/html`, never JSON):
| Method | Path | Body | 200 | Errors |
|---|---|---|---|---|
| POST | `/shelves/user/:userId` | `name` | `#shelves-list` fragment | 400 empty/duplicate · 404 unknown user |
| PATCH | `/shelves/:id` | `name` | `#shelves-list` fragment (owner's shelves) | 400 empty/duplicate · 404 unknown shelf |
| DELETE | `/shelves/:id` | none | `#shelves-list` fragment (owner's shelves) | 404 unknown shelf |

- Fragment: root `<div id="shelves-list">`. It contains either a `.shelves-list` grid of `.shelf-card`s or, with no shelves, `<p class="empty-shelf">No shelves yet. Create one above!</p>`. It is not a full page (no `<html>`, no `<nav>`).
- Each `.shelf-card` keeps the `<a href="/shelves/:id">name</a>` and `N books` text, plus:
  - rename form `class="rename-shelf"`, `hx-patch="/shelves/:id"`, `hx-target="#shelves-list"`, `hx-swap="outerHTML"`, text input `name="name"` prefilled with the current name, `.btn-primary` "Rename"
  - `.btn-remove` "Delete" button, `hx-delete="/shelves/:id"`, `hx-confirm="Delete this shelf?"`, same target/swap
- Error fragments (exact text): `<p class="error">Shelf name is required</p>`, `<p class="error">A shelf with that name already exists</p>`, `<p class="error">User not found</p>`, `<p class="error">Shelf not found</p>`.
- `GET /shelves/user/:userId` (full page) contains: wrapper `<div id="shelves-page" hx-on::before-swap=…>`, `<div id="shelf-error"></div>`, `.add-to-shelf` section with `<form id="new-shelf-form" hx-post="/shelves/user/:userId" hx-target="#shelves-list" hx-swap="outerHTML" hx-on::after-request="if(event.detail.successful) this.reset()">`, `.form-group` with input `id="shelf-name" name="name"`, `.btn-primary` "Create Shelf", then the fragment.
- Model: `renameShelf(id: number, name: string): Shelf | undefined`. It runs `UPDATE shelves SET name = ? WHERE id = ?` and returns `getShelfById(id)` if `changes > 0`, otherwise `undefined`. It throws on a UNIQUE violation. Tests call it directly (import from `../../src/models/shelf.js`) inside `tests/routes/shelves.test.ts`.
- Seed facts tests may use: Alice = user 1 with shelves 1 `want-to-read`, 2 `currently-reading`, 3 `read` (books 1, 2, 16 on shelf 3). Bob = user 2 with shelves 4–6 (same names).

## Acceptance criteria
- AC-1: POST `/shelves/user/1` with `name=  favorites  ` → 200 html, body has `id="shelves-list"` and `>favorites<` (trimmed). Alice then has 4 shelves.
- AC-2: POST `/shelves/user/1` with `name=` or `name=   ` → 400, body contains `<p class="error">Shelf name is required</p>`, not JSON. Alice still has 3 shelves.
- AC-3: POST `/shelves/user/1` with `name=read` → 400 `A shelf with that name already exists`, no crash. Alice still has 3 shelves. After Alice creates `favorites`, POST `/shelves/user/2` with `name=favorites` → 200.
- AC-4: POST `/shelves/user/999` with `name=x` → 404 `<p class="error">User not found</p>`.
- AC-5: PATCH `/shelves/1` with `name=wishlist` → 200 fragment containing `wishlist` and not `want-to-read`. `getShelfById(1).name === 'wishlist'`.
- AC-6: PATCH `/shelves/1` with `name=  ` → 400 required error. With `name=read` → 400 duplicate error. The name is unchanged in both cases.
- AC-7: PATCH `/shelves/1` with `name=want-to-read` (its own name, also with surrounding spaces) → 200, the name is unchanged.
- AC-8: PATCH `/shelves/999` with `name=x` → 404 `<p class="error">Shelf not found</p>`.
- AC-9: DELETE `/shelves/3` → 200 fragment without a link to `/shelves/3`. `shelf_books` rows for shelf_id 3 = 0, books count still 50, Alice's shelves 1 and 2 and their books unchanged, Bob's shelf 6 still has its books.
- AC-10: After DELETE `/shelves/3`, a fresh GET `/shelves/user/1` shows only 2 shelves (no recreation). POST `/shelves/user/1` with `name=read` → 200 and the shelf is back.
- AC-11: DELETE shelves 1, 2 and 3 → GET `/shelves/user/1` is 200 and contains `No shelves yet` and `id="new-shelf-form"`. A following POST create → 200 with the new shelf.
- AC-12: DELETE `/shelves/999` → 404 `<p class="error">Shelf not found</p>`.
- AC-13: GET `/shelves/user/1` contains `id="shelf-error"`, `class="add-to-shelf"`, `hx-patch="/shelves/1"`, `hx-delete="/shelves/1"`, `hx-confirm`, `class="btn-remove"`.
- AC-14 (model, tested in `tests/routes/shelves.test.ts`): `renameShelf(1, 'x')` returns a shelf with name `x`, and `getShelfById(1).name` is `x`. `renameShelf(999, 'x')` returns `undefined`. `renameShelf(1, 'read')` throws (same user). `renameShelf(4, 'x')` succeeds after Alice already has `x` (different user).
- AC-15 (manual): the new controls use the existing classes and palette. `npm run build && npm start` serves `/shelves/user/1`. `npm run test:run` and `npx tsc --noEmit` pass. The `db.test.ts` seed counts (9 shelves) are unchanged. `tests/models/shelf.test.ts` does not exist.

## Implementation (src/ — implementer)
1. `src/models/shelf.ts`: add `renameShelf` per Contract, using `run`/`getShelfById` with `?` placeholders.
2. `src/routes/shelves.ts`: add a local helper `loadShelvesWithBooks(userId)` and reuse it in the GET handler. Add `POST /user/:userId`, `PATCH /:id`, `DELETE /:id` per Contract. Each renders `shelves/shelves-list` with `{ shelves }` or sends the error fragment with `res.status(4xx).send(...)`.
3. `src/views/shelves/shelves-list.ejs` (new): fragment per Contract. Shelf names go through `<%= %>`. Each rename input gets a unique id (`rename-<%= shelf.id %>`) and a label.
4. `src/views/shelves/user.ejs`: add the wrapper with the before-swap handler. If `event.detail.xhr.status >= 400`, set `#shelf-error` innerHTML to `event.detail.serverResponse` and leave `shouldSwap` false. Otherwise clear `#shelf-error`. Add the New shelf form, then `<%- include('shelves-list', { shelves }) %>`.
5. `src/public/css/style.css`: append minimal rules only for `.rename-shelf` (inline flex, gap, input `1px solid #ddd`, 4px radius) and spacing for the card's actions. Don't change existing rules.

## Tests (tests/ — test-writer)
- `tests/routes/shelves.test.ts` (tmp DB `/tmp/test-shelves-routes.db`): AC-1 to AC-13 via supertest, plus a separate `describe('renameShelf')` for AC-14 that calls the model directly. Use supertest's `.type('form').send({ name })` and the `api.test.ts` before/after hooks. Check DB state with `Shelf.getShelvesByUserId` / `all(...)`.
- Do not create `tests/models/shelf.test.ts` (homework gap). No tests for other shelf model functions.

## Out of scope
- Everything under Out of scope in task.md: JSON API endpoints and `api.ts` validation, other shelf model tests, restyling, persistence/`saveDb`, auth/ownership, other shelf features, the `books-list.ejs` id bug, search.
- Name length limits or other validation beyond trim/empty/duplicate.
- Case-insensitive duplicate detection.

## Open questions
None.
