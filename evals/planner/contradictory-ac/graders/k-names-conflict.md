---
type: llm
weight: 4
focus: last_message
---

PASS if the reply's QUESTIONS name the conflict between case-insensitive matching (AC-2) and exact-case matching (AC-4), and give a recommended default.

FAIL if the conflict isn't raised, or the reply picks one behaviour without saying the task.md criteria contradict each other.

You only see the planner's short reply, relayed by a dispatcher. If the reply doesn't give you enough to decide, vote FAIL and start your explanation with "Unknown:".
