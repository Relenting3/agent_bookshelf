# Capstone: Ticket to Merge

Deliverable: repo link (fork + branch) and a README. No Google Doc.
Due **Mon 23 Nov, end of day** (submission window opens Monday EOD). Tested live at Office Hours 4 (Tue). Graded Wed. Pass/fail for the course.

One ticket, from zero to merge-ready, built and reviewed by agents I design. Individual work.
Everything ships as **one plugin, `ticket-to-merge`**, with two entry points: `/ship-ticket` and `/review-pr`.
Graders run `/ticket-to-merge:review-pr` on their own branch.

## The ticket: BOOK-101 · Search books by title or author

Acceptance criteria:
- A query matches title or author: partial, case-insensitive
- An empty query returns all books
- Input is trimmed; over 100 characters returns a validation error
- SQL is parameterised: no string-built queries
- Vitest covers each criterion; `npm run test:run` passes

Interface: left as a placeholder in the brief (`[endpoint and response shape]`).

Constraints: no schema changes, no new dependencies, never touch `bookshelf.db`, `seed.sql` or `.env`, keep the interface exactly as specified.

## The four stages

1. **Set up** (W1): SPEC.md first, CLAUDE.md under 200 lines, a guardrail hook protecting `bookshelf.db`, `seed.sql` and `.env` (match Bash too, exit 2 to block)
2. **Build** (W2, W4): agents ship the ticket test-first; tests read-only while implementing; model per agent; a gate on done (/goal or a Stop hook)
3. **Review** (W2, W4): read-only specialists audit the diff; JSON findings `{file, line, severity, issue, evidence}`; fix loop back to the builders. Plugin agents ignore `hooks` and `permissionMode`: read-only comes from `tools`
4. **Prove** (W3): tests green; plant 3+ bugs and some clean code, run `/review-pr` 3×, report recall and precision; `/usage` after build, review and fix; one lever, quality re-checked

## Scoring (30 + 5)

| Dimension | Measured by | Max |
|---|---|---|
| Hidden tests | Share of Alex's acceptance tests passing on my branch | 8 |
| Review recall | 6 × planted bugs found ÷ planted | 6 |
| Review precision | 4 × real findings ÷ total findings | 4 |
| Guardrails | Hook survives a bypass; reviewers can't edit | 4 |
| Cost report | Priced stages, one lever, quality re-checked | 4 |
| Design | Decomposition and choices justified in the README | 4 |
| Stretch | A: reviewer with memory, or B: plugin eval Δ for /review-pr | +5 |

## README must cover

Repo link (fork and branch) · how to run /ship-ticket and /review-pr · SPEC.md and CLAUDE.md · plugin passes `claude plugin validate` · test run, green · planted bugs: recall and precision over 3 runs · cost report with the one lever · design: why this split, which models, what I'd cut

## Office Hours 4

0:00 setup (hook vs one bypass attempt) · 0:30 design (agents, cost per stage) · 1:15 live `/review-pr` on an unseen planted-bug branch · 2:30 results (hidden test score, evals)
