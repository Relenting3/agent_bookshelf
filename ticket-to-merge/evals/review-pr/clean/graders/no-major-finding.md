---
type: regex
weight: 3
target: last_message
flags: i
pattern: '^(?![\s\S]*"severity"\s*:\s*"major")(?=[\s\S]*?(?:(?:^|\n)[ \t]*\[\s*\][ \t]*(?:\n|$)|\[\s*\{(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:)(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:)(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"severity"\s*:\s*"(?:major|minor)")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"issue"\s*:)(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"evidence"\s*:)))'
---

Key: the reply has a findings array (empty, or whose first object has the 5 keys) and no finding with `"severity": "major"` anywhere. The clean branch has no plants, so a major finding is a false positive. Weight 3 of 5: a minor-only reply scores 0.8 (a real minor test gap was found here in the Session 4 pilot), a reply with no array scores 0.
