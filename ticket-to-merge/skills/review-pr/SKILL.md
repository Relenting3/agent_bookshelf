---
name: review-pr
description: Reviews the current branch, PR or diff against its base (default main) for bugs, security holes, untested acceptance criteria and broken repo rules, using three read-only specialist reviewers and a verifier that drops unproven findings. Writes only its diff file, inside .git/, never the working tree; never asks questions; returns the findings as one JSON array plus a summary line. Use when asked to review this branch, this PR, these changes or the diff.
argument-hint: "[base] [spec-path]"
arguments: [base, spec]
model: sonnet
allowed-tools: Bash(git rev-parse *) Bash(git merge-base *) Bash(git -P diff *) Bash(git ls-files *) Read Grep Glob Agent
---

You run a code review of one branch and print the result as JSON. You coordinate only: **never ask the user anything, never edit a file, write only the diff file (git writes it in step 3, inside .git/, never the working tree), never commit, never run anything but the git commands below.** If something fails, print what the rules below say and stop.

Arguments: base argument = `$base`, spec argument = `$spec` (empty = not given).

Checklist (shared by all four agents): `${CLAUDE_SKILL_DIR}/checklist.md`

## Commands

Use exactly these forms. Write `git -P diff`, never plain `git diff`: some local hooks rewrite or shorten plain `git diff` output, and the reviewers need the raw diff. `EXCL` below means these pathspecs, always in this order:

```
-- . ':(exclude)ticket-to-merge' ':(exclude)homework' ':(exclude).claude' ':(exclude)tickets'
```

If a hook rejects a command and asks you to re-run it with different input, re-run it exactly as given. Batch independent commands in one turn.

## 1. Base

1. `git rev-parse --show-toplevel` and `git rev-parse --absolute-git-dir` (one turn). If they fail: not a git repo → output `[]` and `Review: 0 findings · not run: not a git repository`, then stop.
2. Base ref: the base argument if given; otherwise the first of `main`, `master`, `origin/HEAD` for which `git rev-parse --verify --quiet <ref>` succeeds.
3. `git merge-base HEAD <ref>` → the merge-base SHA. No ref found, or merge-base fails → output `[]` and `Review: 0 findings · not run: no base found (<what you tried>)`, then stop.

Diff file (below, `<diff file>`): `<git dir>/ttm-review-${CLAUDE_SESSION_ID}.diff`, with `<git dir>` = the `--absolute-git-dir` output.

## 2. Spec and CLAUDE.md

- Spec: the spec argument if given; otherwise `SPEC.md` at the repo root if it exists (Glob); otherwise `none`. If the spec argument names a file that doesn't exist, use `none` and add the note `spec <path> not found`.
- CLAUDE.md at the repo root: `yes` or `no` (Glob).

## 3. Diff

Working tree against the merge-base, so line numbers match the files on disk:

1. `git -P diff --stat <sha> EXCL` and `git -P diff --name-status <sha> EXCL`
2. `git ls-files --others --exclude-standard EXCL`: the untracked files. They aren't in the diff; the reviewers Read them in full.
3. If the diff and the untracked list are both empty → output `[]` and `Review: 0 findings · no changes against <ref> <short-sha>`, then stop.
4. If the `--stat` total (insertions + deletions) is about 1,600 or less (≈ 2,000 diff lines): `git -P diff --output=<diff file> <sha> EXCL`. Git writes the file itself (no shell redirect); it prints nothing. Otherwise **large mode**: don't fetch the full diff; pass the `--stat` and the file list, and tell the reviewers to Read the changed files.

**You never read, paste, summarize or describe the diff.** Don't open the diff file; the briefs (steps 4 and 6) carry its path and the agents Read it themselves, so every agent gets the same bytes. Never replace it with "Read the changed files" (that is large mode only), and never characterise the code in a brief (no "safe", "bound params", "looks correct"). The agents judge the code; anything written here about it decides for them what they see.

## 4. Three reviewers, in one message

Launch `ticket-to-merge:reviewer-correctness`, `ticket-to-merge:reviewer-security` and `ticket-to-merge:reviewer-tests-rules` **in a single message** (three Agent calls), always with these scoped names. They get the same brief:

```
Task: Review this branch diff for your area. Reply with ONLY a JSON array, as your instructions say.
Context:
- Base: <ref> (<sha>) · repo root: <path>
- Spec: <path | none> · CLAUDE.md: <yes | no>
- Checklist: <absolute checklist path>
- Changed files (name-status): <list>
- Untracked files (Read these in full): <list | none>
- Diff: Read <diff file> in full (--stat: <the --stat summary line>)   (large mode: "Too large to include. --stat below; Read the changed files." + the --stat)
Constraints: Review only this diff. Read-only. No questions.
Return: a JSON array of {file, line, severity, issue, evidence, scenario}; [] if nothing is found.
```

Wait for all three. They finish in any order; you're notified as each one does. Don't poll and don't read their output files.

## 5. Parse

For each reply: strip a stray code fence or text around the outermost `[` … `]`, then parse it as a JSON array. If it isn't valid JSON, use `[]` and add the note `<reviewer>: unparseable`. Tag every finding with `"reviewer": "<agent name without the plugin prefix>"` and merge all three into one list. `raw` = the number of findings in that list.

## 6. Verifier

- `raw` is 0 → skip the verifier. The result is `[]`, `dropped` = 0.
- Otherwise launch `ticket-to-merge:verifier` with:

```
Task: Verify these review findings against the code on the branch. Reply with ONLY the JSON object your instructions describe.
Context:
- Base: <ref> (<sha>) · repo root: <path>
- Spec: <path | none> · CLAUDE.md: <yes | no>
- Checklist: <absolute checklist path>
- Diff: Read <diff file> in full (--stat: <the --stat summary line>)   (large mode: the same --stat and file list as step 4)
- Findings (<raw>, tagged by reviewer): <the merged JSON array>
Constraints: Read-only. No questions. Don't add findings.
Return: {"findings": [...], "dropped": [...]}
```

Parse its reply as a JSON object (strip a stray fence). Result = its `findings`; `dropped` = the length of its `dropped`. If it isn't valid JSON, or has no `findings` array: result = the merged findings without `scenario` and `reviewer`, `dropped` = 0, and add the note `verifier: unparseable`.

## 7. Output

Make each result item exactly `{"file", "line", "severity", "issue", "evidence"}` (drop any other key), sorted major first, then by file and line. Then print **only** this, with no prose before or after: the array **pretty-printed with a 2-space indent inside a ```` ```json ```` fence** (people read it in a terminal that renders markdown; the fence keeps the evidence verbatim, and scripts strip the fence before parsing), then the summary line below the fence:

````
```json
[
  {
    "file": "…",
    "line": 0,
    "severity": "major",
    "issue": "…",
    "evidence": "…"
  }
]
```
Review: <n> findings (<m> major) · raw <raw> from 3 reviewers · dropped <dropped> by verifier · base <ref> <short-sha> · spec <path|none> · CLAUDE.md yes|no
````

Add ` · notes: <note>; <note>` to the end of the summary line only if there are notes. Empty result → the fence holds `[]`. The early exits in steps 1 and 3 use the same shape: a fence holding `[]`, then their `Review:` line.
