---
name: pr-description
description: Writes a pull request / merge request description (Summary, Changes, How to test, Risks) for the current branch of the agent_bookshelf repo, from its diff against main and the matching plan in .claude/plans/, and saves it to .claude/plans/<slug>-pr.md. Use it whenever someone asks to write, draft or update a PR or MR description, PR body or merge request text, or to "write up the branch for review", even if they don't say "description". Do not use it for reviewing code, writing commit messages, explaining what a diff does in chat, or opening the PR/MR itself.
---

# PR description

Turn the branch's changes into a description a reviewer can read in two minutes. Describe only what the diff shows: the reviewer will check it against the code, so anything invented makes the whole description untrustworthy.

## 1. Gather the input

Run these from the repo root. Changes are often still uncommitted, so diff the working tree against the point where the branch left main, not just the commits:

```bash
git branch --show-current
BASE=$(git merge-base main HEAD)
git diff --stat $BASE
git diff $BASE
git ls-files --others --exclude-standard     # new files not yet added; read each one
ls .claude/plans/
```

- Ignore anything under `.claude/plans/` in the diff. Those files are the input, not the change.
- **Plan file:** if the caller names one, use it. Otherwise pick the `.claude/plans/<slug>.md` (not a `-pr.md`) that matches the branch or the changed files. If none matches, work from the diff alone.
- **Slug:** the plan file's name without `.md`. With no plan, use the branch name with `/` replaced by `-`.
- If the diff is empty and there are no new files, stop and say there is nothing to describe.

## 2. Write it

Use exactly this template. Keep the headings and their order.

```markdown
# <Title: imperative, under 70 characters>

## Summary
<1–3 sentences: what this changes and why. Take the "why" from the plan or task when there is one.>

## Changes
- `<path>`: <what changed in it, one line>

## How to test
1. `npm run test:run`
2. `npx tsc --noEmit`
3. <manual check: `npm run dev`, then the exact URL, request or click, and what you should see>

## Risks
- <risk, and why>
```

Rules for each section:
- **Changes:** one bullet per changed or new file, grouped in this order: `src/`, `tests/`, everything else. Say what changed, not how many lines.
- **How to test:** always keep steps 1 and 2. Add one manual step per user-visible change, with a concrete URL (`http://localhost:3000/...`) or `curl` command and the expected result. Name the test files that were added or changed.
- **Risks:** check the diff for these repo-specific risks and list each one that applies:
  - SQL built by string interpolation instead of `?` placeholders
  - relative imports in `src/` or `tests/` missing the `.js` extension
  - a new runtime file under `src/` (SQL, view, static asset) not added to `copy-assets` and `files` in `package.json`
  - an `/api` route returning HTML, or an HTML/HTMX route returning JSON
  - `seed.sql` or `schema.sql` changes (tests assert on seed counts; existing `bookshelf.db` files won't pick up schema changes)
  - one of the deliberate homework gaps filled in (search, model tests, API validation, styling) when the plan doesn't say so
  - open questions or deferred items in the plan

  Add any other concrete risk you see in the diff. If nothing applies, write `- None identified.` Don't pad this section with generic advice.

## 3. Save and reply

Save the description to `.claude/plans/<slug>-pr.md`, overwriting any older version. Reply with the file path, then the description.
