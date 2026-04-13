# Watch: orchestrate a queue with fresh context per issue

## Arguments

`$ARGUMENTS` is the queue number to watch: `0`, `1`, or `2`.

## Why subagents

Each issue is implemented by a **fresh Agent subagent** so implementation context never bleeds between issues. Planning and approval happen here, in the main conversation, where you can interact with me. Only the heavy implementation work — code, tests, git, CI — runs in the subagent.

## Loop

Repeat the following indefinitely. After each iteration (whether an issue was found or not), use `ScheduleWakeup` with `delaySeconds=60` to self-pace.

---

### 1. Check the queue

```bash
gh issue list --label "queue/$ARGUMENTS" --state open --json number,title,labels --limit 1
```

If no issue is found, report idle and schedule the next wakeup.

---

### 2. Read and investigate the issue

```bash
gh issue view <N> --json number,title,body,labels
gh issue view <N> --comments
```

Read `CLAUDE.md`, `requirements/personas/js-engineer.md`, and `requirements/MEMORY.md`.

Briefly assess: is this a valid, well-scoped issue? Note any ambiguity.

---

### 3. Plan mode — in this conversation

**CRITICAL:** Enter plan mode here, in the main context. Propose an implementation plan. Do not create a worktree or touch any files. Await approval before proceeding.

Determine the short slug (2-4 words from the issue title) and branch name (`issue-<N>-<slug>`) now, so the subagent prompt can be fully specified before spawning.

---

### 4. Spawn an implementation subagent

After plan approval, use the **Agent tool** to spawn a fresh subagent. The subagent runs with a clean context — no memory of this conversation. Pass it everything it needs inline.

Construct the subagent prompt as follows (fill in all `<placeholders>` before spawning):

---

```
You are implementing GitHub issue #<N>: <title>

Read these files first — they are your authoritative context:
- CLAUDE.md
- requirements/personas/js-engineer.md
- requirements/MEMORY.md

Approved implementation plan:
<paste the full approved plan here>

---

Follow these steps exactly. Do not deviate from the approved plan.

1. Label the issue and create a worktree:
   bash .claude/commands/iterate/start-issue.sh <N> <short-slug> <queue-number>
   The script prints `worktree:<path>`. cd into that path. All work happens there.

2. Implement the approved plan.

3. Run tests and fix any failures:
   npm test

4. Commit with a semantic ONE-LINE message (e.g. `fix: remove stale cache check`).
   Then push — run as two separate commands:
   bash .claude/commands/iterate/push-branch.sh issue-<N>-<short-slug>

5. Open a pull request:
   gh pr create --title "<commit message>" --body "Closes #<N>"

6. Poll CI and fix any failures:
   gh pr checks <PR-number> --watch

7. Merge:
   gh pr merge <PR-number> --squash --delete-branch

8. Remove the worktree (run from inside it):
   bash .claude/commands/iterate/remove-worktree.sh

9. Close the issue:
   gh issue edit <N> --remove-label "in-progress"
   gh issue comment <N> --body "<one-paragraph resolution summary>"
   gh issue close <N>
```

---

Wait for the subagent to complete before scheduling the next wakeup.

---

### 5. Schedule next wakeup

```
ScheduleWakeup(delaySeconds=60, prompt="<<autonomous-loop-dynamic>>")
```
