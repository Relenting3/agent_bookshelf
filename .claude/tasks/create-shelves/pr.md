# Add create, rename and delete for shelves in the UI

## Summary
Adds HTMX controls on the user shelves page (`/shelves/user/:userId`) to create, rename and delete shelves. Each action returns a `#shelves-list` fragment that replaces the list in place. Validation errors return 4xx `<p class="error">` fragments, which are shown in a `#shelf-error` slot. The plan is in `.claude/tasks/create-shelves/plan.md`.

## Changes
- `src/models/shelf.ts`: add `renameShelf(id, name)`; `deleteShelf` now deletes the shelf's `shelf_books` rows first.
- `src/public/css/style.css`: append `.rename-shelf`, its input, and `.shelf-card .btn-remove` spacing rules. Existing rules unchanged.
- `src/routes/shelves.ts`: add `POST /user/:userId`, `PATCH /:id` and `DELETE /:id`, with trim, empty and duplicate checks. Add a `loadShelvesWithBooks` helper, now also used by the GET page handler.
- `src/views/shelves/shelves-list.ejs`: new fragment with the shelf cards, rename form and delete button, or an empty-state message.
- `src/views/shelves/user.ejs`: add the `#shelves-page` wrapper with the error-swap handler, the new-shelf form, and include the fragment.
- `tests/routes/shelves.test.ts`: new. Covers AC-1 to AC-13 via supertest and a `renameShelf` model test (AC-14).

## How to test
1. `npm run test:run`
2. `npx tsc --noEmit`
3. Manual checks with `npm run dev`:
   - Open `http://localhost:3000/shelves/user/1`. Submit the "New shelf" form with `  favorites  `. The list gains a `favorites` card, with the name trimmed.
   - Submit the form with a blank name, or with `read`. A red `<p class="error">` appears above the list and the list is unchanged.
   - On a shelf card, change the name in "Rename shelf" to `wishlist` and click Rename. The card shows `wishlist`. Renaming to `read` shows the duplicate error.
   - Click "Delete" on the `read` card and confirm. The card disappears. Its books are not deleted from `/books`.
   - Delete all three of Alice's shelves. The page shows "No shelves yet" and the create form still works.

## Risks
- Open from the reviewer, test: AC-9 compares `shelfBookCount(6)` with its earlier value but does not assert it is above 0, so the "Bob's shelf 6 keeps its books" check passes even if shelf 6 is empty. Planned fix: `expect(before6).toBeGreaterThan(0)`.
- Open from the reviewer, style: the "User not found" error in `src/routes/shelves.ts` is an inline string, while the other three error messages are constants. Planned fix: add a `USER_NOT_FOUND` constant.
- `deleteShelf` deletes `shelf_books` rows explicitly because `ON DELETE CASCADE` never fires in this app: `saveDb()` calls sql.js `export()`, which resets `PRAGMA foreign_keys`. The same missing cascade affects `users`, `books` and `reviews`. Human accepted the explicit delete here; the other tables are out of scope.
- No ownership check: `PATCH /shelves/:id` and `DELETE /shelves/:id` act on any shelf id without checking the requester. Auth and ownership are out of scope per the plan.
- Changes made through the running app are held in memory only (`saveDb()` is not called on writes), so they are lost on restart. This is existing behaviour, not changed here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
