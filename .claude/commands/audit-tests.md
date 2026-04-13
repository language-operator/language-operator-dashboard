---
description: Audit the test suite for gaps, dead tests, and missing coverage against API routes — then file GitHub issues for each finding
---

## Directions

You are a strict test reviewer auditing the Language Operator Dashboard test suite for coverage gaps, dead tests, and quality issues.

### Step 1 — Inventory what exists

Read these files using the Read and Grep tools directly (do not delegate to a subagent):

**Test files** — find every `src/**/*.test.ts` and `src/**/*.test.tsx`. For each test file, capture:
- Which API route or component it covers
- What behaviour or code path it exercises
- What it asserts (what fields/conditions it checks)
- Whether it mocks at the right boundary (e.g. k8s-client, not deeper internals)

**API routes** — skim every file under `src/app/api/**` to identify every route handler. For each:
- What HTTP methods it handles (GET, POST, PUT, DELETE)
- What K8s operations it performs
- What error paths it has (auth failures, not found, validation errors, K8s errors)

**k8s-client methods** — read `src/lib/k8s-client.ts` to capture every method that routes call, so you can identify which are exercised in tests.

### Step 2 — Cross-reference for findings

Work through each API route and check whether a test file covers it.

**Missing test files (highest priority)**
- API routes with no corresponding test file at all
- Routes with tests that only cover one HTTP method but not others

**Missing test cases**
- Error paths that have no test: auth failure, K8s not-found, K8s API error
- Happy-path gaps: response fields the handler writes that no test asserts on

**Dead or vacuous tests**
- Tests that only check `status === 200` but never inspect the response body
- Tests whose name describes behaviour X but the body tests behaviour Y
- Tests that always pass regardless of handler logic

**Mocking quality**
- Tests that mock too deep (e.g. mocking individual k8s-client methods at the HTTP level) vs. tests that mock at the right boundary (`k8s-client.ts` module)
- Tests that stub `fetch` or `Response` directly when they should be testing the route handler

**Assertion quality**
- Tests that create a resource but never assert its fields are correct
- Tests that check an error response exists but not its status code or message shape
- Tests missing edge cases: empty arrays, missing optional fields, malformed input

### Step 3 — Deduplicate against open issues

Before filing, run:
```bash
gh issue list --state open --limit 100
```

Skip any finding already covered by an open issue.

### Step 4 — File issues

For each new finding, file a GitHub issue using `gh issue create`.

- Label missing coverage as `enhancement`
- Label dead/vacuous tests as `enhancement`
- Label incorrect tests (always-pass, wrong assertions) as `bug`
- Title format: `test:` prefix for all issues
- Body must include: the gap, affected test file + function name (or "missing"), the route/behaviour being untested, and a concrete example of what the test should assert
- Group related gaps for the same route into one issue where they share the same root cause

### Step 5 — Summarise

Print a table of all issues filed: issue number, title, label. Note any findings skipped due to existing open issues.
