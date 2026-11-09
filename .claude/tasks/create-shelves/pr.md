# Add create, rename and delete for shelves in the UI

## Summary
Adds three HTMX actions to `/shelves/user/:userId`: create a shelf, rename any shelf, and delete any shelf. Each route re-renders a shared shelf list fragment on success and returns a `<p class="error">` fragment with a 4xx status on failure. The task asked for these controls so users can manage their own shelves without the API.

## Changes
- `src/db/index.ts`: `saveDb()` re-runs `PRAGMA foreign_keys = ON` after `db.export()`, because sql.js export resets pragmas.
- `src/models/shelf.ts`: adds `renameShelf(id, name)`, which runs an `UPDATE` with a `?` placeholder and returns the shelf via `getShelfById`.
- `src/routes/shelves.ts`: adds `POST /user/:userId`, `PATCH /:id` and `DELETE /:id`. Shared helpers render the list, validate the trimmed name (empty, duplicate), and build error fragments.
- `src/views/shelves/shelves-list.ejs`: new fragment with root `#shelves-list`. Each card has a rename form, a Delete button with `hx-confirm`, and an error slot. It shows an empty state when the user has no shelves.
- `src/views/shelves/user.ejs`: adds the "New shelf" form (`#new-shelf-form`) and includes the fragment in place of the old inline list.
- `src/public/css/style.css`: adds `.rename-shelf` styles and a `.shelf-card .btn-remove` spacing rule. Existing rules are unchanged.
- `tests/routes/shelves.test.ts`: new supertest file (tmp DB `/tmp/test-shelves-routes.db`) covering AC-1 to AC-14. It includes `renameShelf` model tests in their own `describe`.

## How to test
1. `npm run test:run`
2. `npx tsc --noEmit`
3. Create: run `npm run dev`, open `http://localhost:3000/shelves/user/1`, submit "  favourites  " in "New shelf". Expect a new "favourites" card with no page reload, and the input cleared. Submitting an empty name or "read" shows an error line under the form.
4. Rename: on `http://localhost:3000/shelves/user/1`, change `want-to-read` to `wishlist` and click Rename. Expect the card to update in place. Renaming to `read` shows an error in that card's slot.
5. Delete: on `http://localhost:3000/shelves/user/1`, click Delete on `read`. Expect a confirm prompt, then the card is removed. Deleting all three shelves shows "No shelves yet. Create one above!" and the New shelf form still works.

## Risks
- `src/db/index.ts`: `saveDb()` now re-enables foreign keys after export. Foreign keys are enforced app-wide, so `/api` writes with unknown ids may now throw where they previously left orphan rows. Accepted by the human reviewer.
- Test coverage gap (reviewer minor issue): the AC-13 test checks that `hx-patch`, `hx-delete` and `hx-confirm` appear somewhere on the page, not that every card has them.
- Test coverage gap (reviewer minor issue): the 400 and 404 tests in `tests/routes/shelves.test.ts` check for `<p class="error">` only, not the exact message text.
- `src/public/css/style.css`: the `.shelf-card .btn-remove` rule goes slightly beyond the plan (harmless).
