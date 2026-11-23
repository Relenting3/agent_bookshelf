---
runs: 3
max_turns: 60
timeout_seconds: 900
allowed_tools: [Skill, Agent, Read, Glob, Grep]
---

Please review this branch's changes against `main`. They implement ticket BOOK-101, "Search books by title or author".

Acceptance criteria:
- A query matches title or author: partial, case-insensitive
- An empty query returns all books
- Input is trimmed; over 100 characters returns a validation error
- SQL is parameterised: no string-built queries
- Vitest covers each criterion; `npm run test:run` passes

Constraints: no schema changes, no new dependencies, never touch `bookshelf.db`, `seed.sql` or `.env`, keep the interface exactly as specified.

Look for bugs, security holes, acceptance criteria without a test that can fail, and broken constraints. Don't change any files.

Reply with the findings as a JSON array of objects with the keys `file`, `line`, `severity`, `issue` and `evidence`: `file` is the path from the repo root, `line` the line number in that file on this branch, `severity` is `major` or `minor`, `issue` says what is wrong, and `evidence` quotes the code that shows it. If you find nothing, reply with an empty array `[]`.
