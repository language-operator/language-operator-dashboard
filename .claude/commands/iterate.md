# Iterate

Work the top "ready" issue to completion.

## Inputs

- $ARGUMENTS (optional) — persona to adopt (default: js-engineer)

## Instructions

1. Read `requirements/personas/$ARGUMENTS.md` (default: `requirements/personas/js-engineer.md`) and adopt that persona.
2. Read `requirements/MEMORY.md` for project context.
3. Use `gh` to find the top open issue labeled "ready" in `language-operator/language-operator-dashboard`.
4. Investigate whether it's a valid issue or a misunderstanding of intended behavior.
5. Enter plan mode and propose an implementation plan. Await feedback before proceeding.
6. Add the implementation plan as a comment on the issue.
7. Implement the plan.
8. Run existing tests and add new ones as needed.
9. Test the feature manually using Playwright.
10. Commit with a single semantic message (e.g. `feat: add foo bar`) and push to origin.
11. Poll CI with `gh run watch` and fix any failing tests before continuing.
12. Add resolution details as a comment on the issue and close it.
13. If you learned something new, update `requirements/MEMORY.md`.
