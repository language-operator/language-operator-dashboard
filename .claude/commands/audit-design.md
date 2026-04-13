---
description: Audit design system compliance — palette violations, missing component usage, DRY failures, off-system one-offs — then file GitHub issues
---

You are a ruthless design system enforcer. Your job is to find every place this application violates, ignores, or reinvents its own design system. You do not tolerate one-off garbage JavaScript. You file issues for everything you find.

## Prerequisites

Read both:
- `requirements/DESIGN_SYSTEM.md` — the canonical spec
- `requirements/personas/js-engineer.md`

Adopt the js-engineer persona.

---

## Step 1 — Inventory the component library

Read every file in `src/components/ui/` and note:
- What component it provides
- What variants/sizes it exposes
- What design patterns it encodes

This is the authoritative list of what agents SHOULD be using. Anything a page or component implements inline that already exists here is a violation.

---

## Step 2 — Scan for palette violations

The only permitted colors are: `stone-*`, `amber-*`, `orange-*` (dark mode fire hover only), `red-*` (destructive only), `neutral-950` (dark mode background only).

Run these Grep searches across `src/app/` and `src/components/` (excluding `src/components/ui/`):

```
# Off-palette color classes — each hit is a violation
grep -rn "text-blue-\|text-green-\|text-yellow-\|text-purple-\|text-gray-\|text-indigo-\|text-cyan-\|text-teal-\|text-violet-\|text-pink-" src/app/ src/components/ --include="*.tsx" --include="*.ts"

grep -rn "bg-blue-\|bg-green-\|bg-yellow-\|bg-purple-\|bg-gray-\|bg-indigo-\|bg-cyan-\|bg-teal-\|bg-violet-\|bg-pink-" src/app/ src/components/ --include="*.tsx" --include="*.ts"

grep -rn "border-blue-\|border-green-\|border-yellow-\|border-purple-\|border-gray-" src/app/ src/components/ --include="*.tsx" --include="*.ts"

# Pure black/white — forbidden per design system
grep -rn '"#000\|"#fff\|text-black\b\|text-white\b\|bg-black\b\|bg-white\b' src/app/ src/components/ --include="*.tsx"
```

For every hit: note the file, line, and what it should be (stone/amber equivalent).

---

## Step 3 — Scan for typography violations

The design system mandates `font-light` (weight 300) everywhere. Bold, medium, and semibold weights are forbidden except inside `src/components/ui/`.

```
grep -rn "font-bold\|font-medium\|font-semibold\|font-normal" src/app/ src/components/ --include="*.tsx" --exclude-dir=ui
```

Also check `ResourceHeader` — it uses `font-bold font-mono` on the `<h1>`, which directly violates the design system's typography rules.

---

## Step 4 — Scan for rounded corners

The design system explicitly forbids `border-radius` / rounded corners ("pure geometry").

```
grep -rn "rounded-\|border-radius" src/app/ src/components/ --include="*.tsx" --include="*.css" --exclude-dir=ui
```

Hits in page files or non-ui components are violations.

---

## Step 5 — Scan for component API bypasses

These patterns indicate a component exists but its API is being ignored in favour of raw CSS overrides:

```
# Button icon sizing — should use size="icon" or size="icon-sm", not raw h/w classes
grep -rn 'Button.*className=.*["\x27]h-[0-9] w-[0-9]\|className=.*["\x27][^"]*h-8 w-8\|className=.*["\x27][^"]*h-9 w-9\|className=.*["\x27][^"]*h-10 w-10\|p-0["\x27]' src/app/ src/components/ --include="*.tsx" --exclude-dir=ui

# Badge with raw color className overrides — should use variant prop
grep -rn 'Badge.*className=.*\(text-\|bg-\)' src/app/ src/components/ --include="*.tsx" --exclude-dir=ui

# Inline status coloring function — should use AnimatedStatus or ResourceStatusBadge
grep -rn "getStatusColor\|getStatusBadge\|statusColor\|statusBadge" src/app/ src/components/ --include="*.tsx" --exclude-dir=ui
```

---

## Step 6 — Scan for DRY violations

```
# formatTimeAgo — duplicated across multiple page files; should be a shared util
grep -rn "formatTimeAgo\|timeAgo\|function.*TimeAgo" src/app/ src/components/ --include="*.tsx" --include="*.ts"

# Inline filter bar pattern — Card > CardHeader "Filters" > CardContent > flex gap-4 with Input/Select
# This pattern appears in multiple list pages and should be a reusable FilterBar component
grep -rn '"Filters"' src/app/ --include="*.tsx"

# Inline empty state pattern — repeated across list pages; should be an EmptyState component
grep -rn "No.*found\|No.*yet\|Create your first\|get started" src/app/ --include="*.tsx" -l
```

For each DRY violation: count how many files contain the duplicate, identify what the shared component/util should be called, and note where it belongs (`src/lib/` for utils, `src/components/ui/` for UI patterns).

---

## Step 7 — Scan for browser API misuse

```
# confirm() — should use AlertDialog (already in the component library)
grep -rn "confirm(" src/app/ src/components/ --include="*.tsx"

# alert() — same; never acceptable
grep -rn "\balert(" src/app/ src/components/ --include="*.tsx"

# console.log/error/warn in component files — should not reach production
grep -rn "console\.\(log\|error\|warn\|debug\)" src/app/ src/components/ --include="*.tsx"
```

---

## Step 8 — Scan for TypeScript quality violations

Strict mode is enabled. `any` in component files is a design failure, not just a type error.

```
grep -rn ": any\b\|as any\b\|(any)\b" src/app/ src/components/ --include="*.tsx" --include="*.ts" --exclude-dir=ui
```

---

## Step 9 — Assess DESIGN_SYSTEM.md accuracy

After scanning the actual code, compare against `requirements/DESIGN_SYSTEM.md`:

- Does the doc describe the components that actually exist in `src/components/ui/`? If components exist that the doc doesn't cover, the doc is stale.
- Does the doc's "Don't" list match violations you found in the code? If the same violations appear everywhere, the doc may need enforcement-focused additions.
- Are there patterns in the codebase that contradict what the doc prescribes?

Note what needs updating in the doc (this is an issue to file, not something to fix inline).

---

## Step 10 — Deduplicate against open issues

```bash
gh issue list --state open --limit 100
```

Skip any finding already covered by an open issue.

---

## Step 11 — File issues

For each category of violation, file a GitHub issue:

**Labelling:**
- Off-palette color violations → `bug` + `design`
- Typography violations → `bug` + `design`
- Rounded corners → `bug` + `design`
- Component API bypasses → `enhancement` + `design`
- DRY violations (duplicate utils/patterns) → `enhancement` + `design`
- `confirm()` / `alert()` usage → `bug` + `design`
- `console.log` in components → `bug`
- `any` types → `bug`
- DESIGN_SYSTEM.md staleness → `enhancement` + `design`

**Title format:** `design:` prefix for all issues.

**Body must include:**
- The rule being violated (quote the design system or component API)
- Every affected file and line number (or representative examples if there are many)
- The exact fix: what to replace it with, which component/variant/prop to use instead
- For DRY violations: the proposed name and location for the new shared component/util

**Group related violations** for the same root cause into one issue (e.g., all `formatTimeAgo` duplicates → one issue; all off-palette status colors → one issue). Do NOT file one issue per line — that is noise.

---

## Step 12 — Summarise

Print a table: issue number, title, label, number of affected files. Then state clearly:

- How many issues were filed
- Which categories had the most violations
- What the single highest-impact fix would be (the one that cleans up the most surface area)
- Whether `requirements/DESIGN_SYSTEM.md` needs updates and what kind
