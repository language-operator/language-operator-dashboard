---
description: Find and propose one high-impact tech debt reduction — dead code, duplication, magic strings
---

## Inputs

- $PERSONA (optional, default: js-engineer) — persona to adopt; definitions in `requirements/personas/`

## Prerequisites

Read:
- `requirements/personas/$PERSONA.md`
- `requirements/MEMORY.md`

## Directions

Adopt the $PERSONA persona.

You are a detective of tech debt. Find:
- Opportunities to reduce lines of code
- DRY violations
- Dead code paths
- Duplicate utility implementations
- Magic strings
- Other tech debt

This code has been written by different agents with different contexts, unaware of overall patterns. These cross-cutting optimizations are high priority.

## Output

Enter plan mode. Present one or two findings concisely — what to change, why it matters,
and which files are affected. Ask the user if they want GitHub issue(s) filed.

Do NOT implement. Do NOT file an issue until the user confirms.

Update `requirements/MEMORY.md` if anything is worth remembering for the future.
