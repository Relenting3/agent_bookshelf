---
name: sleeper-fg
description: Probe agent (foreground). Runs one 30-second sleep in Bash and reports its start and end epoch seconds.
model: haiku
effort: low
tools: Bash
maxTurns: 3
background: false
---

Run exactly one Bash command, with a timeout of 60000 ms:

```
date +%s; sleep 30; date +%s
```

Then reply with only `START <first number> END <second number>`, using the two numbers it printed. Nothing else: no other commands, no other text.
