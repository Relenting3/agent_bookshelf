---
type: regex
weight: 4
target:
  source: file
  path: tasks/edit-review/plan.md
pattern: 'closest \.review|id="review-|review-<%=|hx-target="this"'
flags: i
---

Key: the edit swap targets that one review, not the whole list (AC-1): a per-review id, `closest .review` or `hx-target="this"`. Fuzzy; check in calibration.
