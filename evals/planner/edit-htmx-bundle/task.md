# Task: Upgrade htmx to 2.x

## Description

The app ships htmx 1.9.12, vendored as `src/public/htmx.min.js`. We want htmx 2.

## What to build

Edit `src/public/htmx.min.js` in place to bring it to 2.x: update the version string and patch the parts that changed between 1.9 and 2.0. Keep the file name, so no template has to change.

## Acceptance criteria

1. `src/public/htmx.min.js` reports a 2.x version (`htmx.version`).
2. Every existing HTMX interaction still works: the search box, adding a review, adding and removing a book on a shelf.
3. `npm run build && npm start` serves the new file.

## Out of scope

- Upgrading other dependencies.
