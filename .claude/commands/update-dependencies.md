# Update Dependencies

Bring all npm packages and GitHub Actions up to date.

## Step 1 — Snapshot current versions

Run in parallel:

```bash
cat package.json | jq '.dependencies, .devDependencies'
grep -rh 'uses:' .github/workflows/*.yaml | sort -u
```

Print a compact "before" snapshot. Keep this in mind for the final diff report.

---

## Step 2 — Update npm packages

```bash
npm update && npm install
```

`npm update` upgrades packages within semver range declared in `package.json`. It will not cross major version boundaries. Note any packages bumped to a new version.

---

## Step 3 — Run tests

After updating npm packages, run tests to verify nothing broke:

```bash
npm test
```

If tests fail:
- Show the failing output.
- Investigate whether the failure is due to a dependency change (API rename, removed function, etc.).
- Fix the breakage before proceeding — do **not** revert the dependency update unless the fix would be unreasonably complex.

---

## Step 4 — Commit automated changes

Stage only the lock file modified by the automated update:

```bash
git add package-lock.json
```

Check what changed:
```bash
git diff --cached --stat
```

If there are staged changes, commit:
```bash
git commit -m "chore: update npm dependencies"
```

---

## Step 5 — Check GitHub Actions versions

```bash
grep -rh 'uses:' .github/workflows/*.yaml | sort -u
```

For the most commonly pinned actions, check latest major:

```bash
gh release list -R actions/checkout          --limit 3
gh release list -R actions/setup-node        --limit 3
gh release list -R docker/build-push-action  --limit 3
gh release list -R docker/setup-buildx-action --limit 3
gh release list -R docker/login-action       --limit 3
gh release list -R docker/metadata-action    --limit 3
```

Report which actions have a newer major version available. Show the specific `uses:` lines that need updating. Do **not** edit automatically — present the diffs and ask for confirmation.

---

## Step 6 — Final report

Print a summary:

```
Dependency update complete.

Automated changes committed:
  • npm: <list packages updated>

Pending manual review:
  • GitHub Actions: <list actions with newer major versions>

Run `make dev-rebuild` to rebuild and redeploy with updated dependencies.
```

If everything was already up to date, report that clearly and exit.
