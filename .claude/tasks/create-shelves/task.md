# Task: Create, rename and delete shelves in the UI

## Description

Users can see their shelves at `/shelves/user/:userId` and add or remove books on a shelf, but they can't manage the shelves themselves from the UI. This task adds three actions to the user's shelves page:

- **Create** a new shelf.
- **Rename** a shelf.
- **Delete** a shelf.

Every user has three default shelves: `want-to-read`, `currently-reading` and `read`. These are protected: they can't be renamed or deleted. Only shelves the user created can.

Today `models/shelf.ts` has `createShelf()` and `deleteShelf()` but no rename function. `routes/shelves.ts` has no routes for any of the three actions.

## What to build

**Model (`src/models/shelf.ts`)**
- A `renameShelf(id, name)` function that updates the shelf's name.
- One place that defines the default shelf names, plus a way to check if a shelf is a default (for example `isDefaultShelf(shelf)`). The routes and the view both use it.

**HTML routes (`src/routes/shelves.ts`)** use HTMX and return a fragment. Suggested routes; the planner can adjust them:
- `POST /shelves/user/:userId` creates a shelf. The body is `name`.
- `PATCH /shelves/:id` renames a shelf. The body is `name`.
- `DELETE /shelves/:id` deletes a shelf.

On success, each route re-renders the user's shelf list fragment. On error, it returns a `<p class="error">` HTML fragment with a 4xx status, never JSON (CLAUDE.md rule 5).

**Views (`src/views/shelves/`)**
- Move the shelf list in `user.ejs` into a new fragment, for example `shelves-list.ejs`. Its root element has `id="shelves-list"`, matching the `hx-target`. `user.ejs` includes the fragment.
- Add a "New shelf" form on `user.ejs` (`hx-post`). It resets after a successful request, like the add-book form in `show.ejs`.
- Each non-default shelf card gets:
  - an inline rename form (`hx-patch`)
  - a Delete button (`hx-delete` with `hx-confirm`)
- Default shelf cards show no rename or delete controls.

**Tests**
- A new `tests/routes/shelves.test.ts` with supertest. It uses its own tmp DB path, distinct from the other test files (CLAUDE.md rule 6).
- Tests for `renameShelf` and the default-shelf check only. See Out of scope.

## Acceptance criteria

**Create**
- [ ] On `/shelves/user/:userId`, submitting a name creates a shelf for that user. It appears in the list without a full page reload.
- [ ] The name is trimmed. An empty or whitespace-only name is rejected with a 400 and a `<p class="error">` fragment, and nothing is created.
- [ ] A name that already exists for that user is rejected with a 400 error fragment. This includes the default names. The server must not crash on the UNIQUE constraint.
- [ ] An unknown `userId` returns a 404.

**Rename**
- [ ] Renaming a user-created shelf updates its name in the list without a full page reload.
- [ ] The empty-name and duplicate-name rules from Create apply to rename too.
- [ ] Renaming a default shelf is rejected with a 4xx error fragment, and the name doesn't change.
- [ ] An unknown shelf id returns a 404.

**Delete**
- [ ] Deleting a user-created shelf asks for confirmation (`hx-confirm`), then removes it from the list without a full page reload.
- [ ] The books on a deleted shelf are removed from that shelf. Its `shelf_books` rows are deleted by the existing FK cascade. The books themselves and the user's other shelves are unchanged.
- [ ] Deleting a default shelf is rejected with a 4xx error fragment, and the shelf still exists.
- [ ] An unknown shelf id returns a 404.

**General**
- [ ] Default shelves show no rename or delete controls in the UI.
- [ ] All SQL uses `all` / `get` / `run` with `?` placeholders (rule 2). Relative imports end in `.js` (rule 3).
- [ ] Any new view template sits under `src/views/`, which `copy-assets` already copies. Check that `npm run build && npm start` serves the page, not only `npm run dev`.
- [ ] `npm run test:run` and `npx tsc --noEmit` pass. The existing seed-count tests are unchanged: 9 shelves, 3 per user.

## Out of scope

- **JSON API:** no new create, rename or delete endpoints under `/api`, and no input validation added to `src/routes/api.ts`. That validation is a homework gap.
- **Shelf model tests beyond the new code:** don't add tests for `getShelvesByUserId`, `createShelf`, `deleteShelf`, `addBookToShelf`, etc. Tests for `models/shelf.ts` are a homework gap. Only `renameShelf` and the default-shelf check get model tests.
- **Styling:** `style.css` stays minimal. Only add a class if the new controls are unusable without one. That's a homework gap too.
- **Persistence:** making writes survive a server restart (`saveDb()` isn't called after writes). This affects every write in the app and is a separate issue.
- **Auth or ownership:** there's no logged-in user. Anyone can manage any user's shelves, same as adding books today.
- **Other features:** reordering shelves, moving books between shelves, and shelf descriptions or privacy.
- **The existing `books-list.ejs` fragment:** its root element lacks `id="shelf-books-list"`, so a second add or remove on the same page loses the target. Fix it in its own task, not here.
- **Search:** the stubbed `GET /books/search` route. It's a separate task.
