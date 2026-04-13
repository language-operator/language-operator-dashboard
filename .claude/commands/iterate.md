# Action: do the next logical piece of work

## Prerequisites

Please read the following context files:

* Project: CLAUDE.md
* Persona: requirements/personas/js-engineer.md
* Memory: requirements/MEMORY.md

## Persona

**CRITICAL**: Adopt the given persona while executing these instructions, please.

## Hard rules — read before anything else

- **NEVER** use `CronCreate`, `ScheduleWakeup`, or any scheduling tool. You are not an orchestrator. You work exactly one issue and stop.
- **NEVER** skip plan mode. You must use the `EnterPlanMode` tool and wait for the user's written approval before creating a worktree or modifying any file.
- **NEVER** work in the main worktree. All implementation happens inside the git worktree created in step 4.

## Arguments

`$ARGUMENTS` is either:
- A queue number to work from: `0`, `1`, or `2`
- A specific issue reference: `#123`, `issue #123`, or bare `123`

## Instructions

### Step 1 — Find the issue

**If `$ARGUMENTS` looks like an issue ID** (contains `#` or is a plain integer ≥ 10):
- Fetch it: `gh issue view <N> --json number,title,labels,state`
- If closed or not found, report and **stop**.
- Read comments: `gh issue view <N> --comments`
- Note: skip the queue-label removal in step 4 and pass an empty string for `<queue-number>` to `start-issue.sh`.

**Otherwise** treat `$ARGUMENTS` as a queue label:
- `gh issue list --label "queue/$ARGUMENTS" --state open --json number,title,labels --limit 1`
- If no issue is found, report idle and **stop**.
- If found, read its comments too.

### Step 2 — Investigate

Is the issue valid, or a misuse of the intended feature? Note any ambiguity. Do not skip this — you will reference it in the plan.

### Step 3 — Plan mode (MANDATORY GATE)

Call the `EnterPlanMode` tool now. Do not proceed past this step until you have:
1. Entered plan mode
2. Presented a complete implementation plan (files to change, approach, test strategy)
3. Received explicit written approval from the user

**You may not create a worktree, label an issue, or touch any file until the user approves the plan.**

### Step 4 — Label and create worktree

After approval, determine a short slug (2-4 words from the issue title), then:

```bash
bash .claude/commands/iterate/start-issue.sh <N> <short-slug> <queue-number>
```

The script labels the issue `in-progress`, removes the queue label, and creates a worktree. It prints `worktree:<path>` — `cd` into that path. **All subsequent work happens inside this worktree. Do not `cd` out of it.**

### Step 5 — Implement

Implement the approved plan. Stay within the worktree. Follow CLAUDE.md patterns.

### Step 6 — Test

```bash
npm test
```

Fix any failures before proceeding. Do not skip or work around failures.

### Step 7 — Commit and push

Write a semantic, one-line commit message (e.g. `fix: remove stale cache check`). Run as two separate commands:

```bash
git commit -m "<message>"
bash .claude/commands/iterate/push-branch.sh <branch-name>
```

### Step 8 — Open a pull request

```bash
gh pr create --title "<commit message>" --body "Closes #<N>"
```

Use conventional commit style for the PR title.

### Step 9 — Poll CI

```bash
gh pr checks <PR-number> --watch
```

Fix any failing checks. Do not merge until all checks pass.

### Step 10 — Merge

```bash
gh pr merge <PR-number> --squash --delete-branch
```

### Step 11 — Remove worktree

Run from inside the worktree — no arguments needed:

```bash
bash .claude/commands/iterate/remove-worktree.sh
```

### Step 12 — Close the issue

```bash
gh issue edit <N> --remove-label "in-progress"
gh issue comment <N> --body "<resolution details>"
gh issue close <N>
```

### Step 13 — Update memory

Consider whether `requirements/MEMORY.md` needs updating. It is not a changelog — only add things you might forget in a future session.

### Step 14 — Stop

**Stop here.** Do not schedule yourself. Do not loop. The queue orchestrator (`/watch`) will invoke you again when needed.

## Output

A merged PR, test coverage, updated CI, and a closed ticket.
