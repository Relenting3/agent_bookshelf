---
name: homework-writeup
description: Writes up the user's weekly agentic-development course homework into that week's Google Doc for Ballast Lane, using the assignment and the /export conversation files saved in homework/week-N/. Use it whenever the user asks to write up, document, fill in, or submit the homework or one of its parts ("write up part 3 of the first homework", "add week 2 to the doc", "submit last week's homework"), and when they share a new week's assignment (screenshot or text) so it gets saved and its doc created. Do not use it for doing the homework itself (building the CLAUDE.md, skill or hook a part asks for) or for general questions about course topics like skills, hooks, workflows or context.
---

# Homework write-up

The user takes a weekly course on agentic development and does the homework in this repo. Each week is submitted as one Google Doc shared with Ballast Lane, containing, for every part, the prompts the user wrote, what came out, and screenshots. This skill holds everything the user would otherwise re-paste each time: where things live, how the doc is laid out, and the formatting corrections they've already made.

## Where things live

```
homework/
  week-N/
    assignment.md            first line "Doc: <link>", then the list of parts
    part-<n>-<topic>.txt     /export of the conversation for part n (gitignored)
```

**Pick the week.** If the user names one ("first homework", "week 1", "last week's homework"), use that week's folder. "Last week's" means the week before the newest `week-N` folder (or week 1 if it's the only one). If they don't name one, use the newest week. When the reference was indirect, say which week you picked in your first line so a wrong guess is caught early.

**The doc link** is the `Doc:` line at the top of that week's `assignment.md`. Use that doc and no other.

## A new assignment

When the user shares a new week's assignment (screenshot or pasted text):

1. Work out the week number (next after the newest folder, unless the user says otherwise) and create `homework/week-N/assignment.md`: a `# Week N Homework` heading and a numbered list with one line per part, giving the part's topic in bold and what it asks for. Keep the assignment's wording and requirements (limits, counts, what must be shown). Drop course boilerplate.
2. Make sure the week has no doc yet. The user submits exactly one doc per week, and a second one means a stray link that someone might share by mistake. Check for a `Doc:` line in `assignment.md`, then search Drive for the title below. If either turns up a doc, reuse it.
3. Otherwise create a Google Doc with the Google Drive connector, titled exactly `Agentic Development Course - Week N Homework`. Give it the title and one empty heading per part (`Part 1: CLAUDE.md`, `Part 2: Skill`, ...), nothing else.
4. Put `Doc: <link>` as the first line of `assignment.md`, then give the user the link so they can share it with Ballast Lane.

## Writing up parts

### 1. Decide which parts to write

- A specific part ("write up part 3") means only that part.
- A whole week ("write up the first homework") means every part that has an export file and isn't in the doc yet.
- If a part the user asked for has no `part-<n>-*.txt` file, say so and don't write it. Guessing at prompts the user never wrote would put invented words in a graded submission under their name. Write the other parts that do have exports.
- Read the exports from the week's folder. The user won't paste them.

### 2. Read the doc first

Read the doc before writing anything (Drive `read_file_content` gives a compact Markdown view, which is enough to see what's there). Note:

- **Which parts are done.** A part is done when its section has content beyond the heading and empty placeholders. Skip done parts when writing up a whole week.
- **The existing structure and formatting**: heading levels, how parts are titled, how prompts are set off, how links and screenshot placeholders look. Copy these exactly so the doc reads as one piece. The template below is only for a doc that has no written parts yet.
- **Content in the part you're about to write.** If the part already has content, ask the user before overwriting it, and show them what's there. They may have edited it by hand.

### 3. Pull the prompts and results from the export

In a Claude Code `/export`, the user's messages start with `> ` (continuation lines are indented), Claude's turns start with `⏺`, and tool output is under `⎿`.

- **Prompts:** take every message the user typed that steered the work, in order, copied character for character, including typos, casing and line breaks. Their exact wording is what's being graded, and a cleaned-up version stops being their prompt. You choose which messages to include; you never edit one. Leave out housekeeping commands (`/export`, `/clear`, `/compact`), but keep commands that were part of the work (`/init`, `/context` when the assignment asks to show it). If a prompt only points at a file (`Execute @homework/week-1/skill-prompt.md`), the file holds the real prompt: show the line as typed, then the file's contents verbatim.
- **Result:** what the work produced, in a few sentences or bullets: the files created or changed, and the behaviour that proves the part's requirement (the hook blocked X, the skill triggered on Y but not on Z). Check the assignment's requirements and make sure the result shows each one.

### 4. Write the section

Each part has exactly three blocks: **Prompt(s)**, **Result**, **Screenshots**. Don't add anything else: no summary, no "Rules" recap, no "Manual refinement" or "Lessons learned" section. The user has removed those before; they read as filler and the reviewers skim past them.

Default layout for a doc with no written parts yet (otherwise match the doc):

```
Part 2: Skill                                   ← Heading 1
Prompt(s)                                       ← Heading 2
<each prompt verbatim, in a monospace font, blank line between prompts>
Result                                          ← Heading 2
<2–5 short sentences or bullets, with file links>
Screenshots                                     ← Heading 2
[SCREENSHOT: skill triggering on "write up part 3 of the first homework"]
[SCREENSHOT: skill not triggering on "how do skills get loaded into context?"]
```

**Files are linked, not pasted.** When the result is a file (CLAUDE.md, a SKILL.md, a hook script, settings.json), link it instead of pasting its content. Prefer a GitHub permalink on `origin` at the commit that contains it (`https://github.com/<owner>/<repo>/blob/<sha>/<path>`). Check with `git` that the commit is pushed. If it isn't, ask the user whether to push first rather than linking to something reviewers can't open. A short excerpt (a few lines) is fine when it's the point of the result, such as the one rule a hook enforces.

**Screenshot placeholders** say exactly what to capture, so the user can take them without re-reading the session: the command or prompt to run and what must be visible. Derive them from what the assignment says to *show* (e.g. "shown listed in /context" becomes `[SCREENSHOT: /context output with CLAUDE.md listed under Memory files]`). Use one placeholder per screenshot. The user takes them all, so never insert images.

### 5. Edit the doc

Before the first edit, load the `google-workspace` skill and read its `references/docs.md`. Doc positions shift after every insert, and that skill covers how to place content and guard each write. Edit the existing doc in place under the right part heading. Never create a new doc to get around an edit, and never change the doc's sharing or permissions: the user shares it with Ballast Lane themselves.

After writing, read the doc again to check that the sections landed under the right headings with the right formatting. Then reply briefly:

- the doc link (it's the same doc, so say the link is unchanged),
- which parts you wrote, and which you skipped and why (already done, or no export),
- the screenshot placeholders the user now needs to capture.
