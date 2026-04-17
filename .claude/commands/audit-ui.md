---
description: Smoke-test the live dashboard UI with Playwright — walk every major route, check for console errors, file GitHub issues for bugs found
---

You are a meticulous QA engineer performing a structured smoke test of the Language Operator Dashboard. You test systematically, capture every failure, and file clear actionable bugs.

The target URL is: $ARGUMENTS (default `http://localhost:3000` if not provided).

---

## Step 1 — Get a bearer token

Run:

```bash
kubectl create token language-operator-dashboard-admin -n language-operator
```

Save the token — you will use it to authenticate in Step 3.

---

## Step 2 — Login page (unauthenticated)

Navigate to `$URL/login`. Verify:

- The page renders without a blank screen or crash
- A token textarea is visible
- Submitting with an empty field or a clearly invalid value (e.g. `bad-token`) shows an error message — not a crash, redirect loop, or unhandled exception

---

## Step 3 — Authenticate

Fill the token textarea with the token from Step 1 and submit. Verify:

- The page redirects to the dashboard (not back to `/login`)
- No error banner or crash state is shown
- The URL is no longer `/login`

---

## Step 4 — Walk the golden path

For each route in the table below: navigate to it, wait for the page to finish loading, take a screenshot, and note any of the following:

- Blank or white screen
- Error banner, toast, or crash boundary
- Missing content where content is expected (e.g. an empty list with no empty state UI)
- Visible `[object Object]`, `undefined`, `NaN`, or raw stack traces
- Any browser console errors (check after each navigation)

| Route | What to verify |
|---|---|
| `/` | Dashboard home renders — recent activity or welcome state visible |
| `/clusters` | Cluster list renders — shows clusters or an empty state |
| `/clusters/[first cluster name]` | Cluster overview page loads |
| `/clusters/[name]/agents` | Agent list loads |
| `/clusters/[name]/models` | Model list loads |
| `/clusters/[name]/tools` | Tool list loads |
| `/clusters/[name]/personas` | Persona list loads |
| `/runtimes` | Runtime list loads |
| `/settings` | Settings page loads |
| `/settings/profile` | Profile page loads |

To find a real cluster name for the dynamic routes, check the cluster list page first. If no clusters exist, skip the `/clusters/[name]/*` routes and note it in your summary.

---

## Step 5 — Console error audit

Review all browser console errors captured during Steps 2–4.

Ignore expected noise:
- Next.js HMR / Fast Refresh messages
- `[webpack]` internal messages
- `Failed to load resource` for known-missing favicons

Flag everything else — each unique error message with a distinct origin file and line is a candidate bug.

---

## Step 6 — Deduplicate

Before filing, run:

```bash
gh issue list --label bug --state open --limit 100 --repo language-operator/language-operator-dashboard
```

Skip any finding already covered by an open issue.

---

## Step 7 — File issues

For each new bug, create a GitHub issue:

```bash
gh issue create \
  --repo language-operator/language-operator-dashboard \
  --label bug \
  --title "ui: <short description>" \
  --body "..."
```

Use this body template:

```
**Expected:**
<what should happen and why it matters>

**Actual:**
<what happened instead, including the route and any visible error text>

**Acceptance Criteria:**
- [ ] <specific thing that must be true when resolved>
```

Group multiple failures on the same page into one issue if they share the same root cause.

---

## Step 8 — Summarise

Print a table of all findings:

| Route | Finding | Verdict |
|-------|---------|---------|
| `/login` | ... | filed #123 / duplicate of #99 / known |
| `/clusters` | ... | filed #124 / clean |

End with: **N bugs filed, M routes clean.**
