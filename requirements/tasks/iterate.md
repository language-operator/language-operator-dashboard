# Task

## Prerequisites

Please read the following context files:

* Persona: requirements/personas/:persona.md
* Memory: requirements/MEMORY.md

## Persona

**CRITICAL**: Adopt the given persona while executing these instructions, please.

## Instructions

Follow these directions closely:

1. Use the `gh` tool to find the top issue for this repository (language-operator/language-operator-dashboard) with the "ready" label.
2. Investigate if it's valid, or a misunderstanding of the intended feature.
3. **CRITICAL:** Switch to plan mode, and propose an implementation plan.  Await my feedback.
4. Add your implementation plan as a comment on the issue.
5. Implement your plan.
6. Run existing tests, and add new ones if necessary.  Remember to include CI.
7. **CRITICAL:** Test the actual functionality manually in Playwright.
8. Commit the change with a semantic, ONE LINE message, like 'feat: create task_definition structure' and push to origin.
9. **CRITICAL:** Poll CI using the `gh` command to monitor tests.  Fix failing tests before proceeding.
10. Add resolution details as a comment on the GitHub issue.
11. Resolve the GitHub issue.
12. If you learned something new, add it to requirements/MEMORY.md.

## Output

An implementation, test coverage, updated CI, and a closed ticket.