/anthropic-skills:skill-creator

I need to create a skill in this repo, inside .claude/skills/homework-writeup/

I'm using this repo to do the weekly homework of a course about agentic development (skills, hooks, workflows, etc.). Each week has a few parts, and I submit each week in its own Google Doc shared with Ballast Lane, with my prompts, the result and screenshots for each part.

The problem is that every time I write up a part, I end up pasting the same things again: the assignment, how it should be submitted, the doc link, and the same corrections about the formatting. I want the skill to keep all of that, so I don't have to.

Everything for a week lives in its own folder:

```
homework/
  week-1/
    assignment.md          (assignment and doc link)
    part-1-claude-md.txt   (/export of the conversation for each part)
    part-2-skill.txt
    part-3-guardrail.txt
  week-2/
    ...
```

This is how I'd like it to work:
- When I share a new assignment (screenshot or text), save it in homework/week-N/assignment.md as a short list of the parts and what each one asks.
- For a new week, create a new Google Doc using the Google Drive connector, named "Agentic Development Course - Week N Homework", with an empty section for each part. Save the doc link at the top of assignment.md, and give me the link so I can share it with Ballast Lane.
- Never create a second doc for the same week.
- If I mention a specific week ("first homework", "week 1", "last week's homework"), use that week's folder and doc. If I don't, use the latest week.
- I'll save the conversation of each part with /export, as homework/week-N/part-N-<topic>.txt. Read the conversations from that week's folder. I won't paste them in the prompt.
- If I ask for a specific part ("write up part 3 of the first homework"), only write that part. If I just say "write up the first homework", write every part that has an export file and isn't in the doc yet.
- If the export for a part I asked for is missing, tell me instead of guessing.
- Read the Google Doc first to see which parts are already done, and follow the same structure and formatting that's already there. If a part already has content, ask me before overwriting it.
- Write the section for each part: my prompts, the result, and placeholders for the screenshots.

Things the skill should know:
- Each part should be: Prompt(s), Result, Screenshots
- Keep it short. I don't want extra sections that feel like AI slop (like a "Rules" recap or "Manual refinement" section).
- If the result is a file (CLAUDE.md, SKILL.md, a hook script), attach or link it instead of pasting all its content.
- Copy my prompts exactly as I wrote them. Don't rephrase them.
- The formatting should look clean and consistent with the rest of the doc.
- I take the screenshots myself, so just leave placeholders like [SCREENSHOT: /context output showing CLAUDE.md loaded], saying exactly what I need to capture.
- Never touch the sharing settings of the doc, I'll share it myself.

Also:
- Create homework/week-1/assignment.md with this week's assignment. Week 1 already has a doc, so don't create a new one:

  Doc: https://docs.google.com/document/d/1yuIQczK0uZlq1y-5xdF9bqRkm3B9mMqqsBsu2DilbNI

  1. CLAUDE.md: under 200 lines, at least three concrete rules, shown listed in /context
  2. Skill: for context you keep re-pasting. Show one prompt that triggers it and one that shouldn't
  3. Guardrail: a blocking hook that survived a partner's bypass attempts, or the permission rule that replaced it

- Add homework/*/part-*.txt to .gitignore, since the exports contain my full sessions. The assignment.md files should stay tracked.

For the description, it should trigger when I ask to write up or submit the homework, but not for general questions about the course topics.

Important: don't create or edit any Google Doc while you are building or testing the skill. Only create the skill files, homework/week-1/assignment.md and the .gitignore entry.
