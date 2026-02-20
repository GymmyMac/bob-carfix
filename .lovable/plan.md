

# Documentation Tidy-Up: Consolidate and Remove Duplicates

## Current Problem

Bob has 8 documentation files with heavy overlap. The same installation instructions, layout diagrams, callback signatures, and verification checklists appear in 3-4 places. This makes updates error-prone — change one file and the others go stale.

## Proposed Structure (4 files, down from 8)

```text
BOB-COMPLETE-PROCESS-FLOW.md          (root)   -- Personality, states, Brain, canned speech, playbook
packages/bob-widget/
  README.md                                     -- npm package README (installation + integration)
  CHANGELOG.md                                  -- Version history (unchanged)
  BOB-DOCUMENTATION.md                          -- Technical reference (props, API, CSS, troubleshooting)
```

## Files to DELETE (4 files removed)

| File | Reason |
|------|--------|
| `packages/bob-widget/BOB-PROCESS-FLOW.md` | Fully replaced by `BOB-COMPLETE-PROCESS-FLOW.md` in root |
| `packages/bob-widget/install/carfix/CARFIX-INSTALLATION-BRIEF.md` | Near-identical copy of `README.md` — all content already there |
| `packages/bob-widget/install/carfix/00-README-PREINSTALL.md` | Duplicates `BOB-DOCUMENTATION.md` Section 10 (3-stage install) |
| `packages/bob-widget/install/carfix/05-runtime-verification-checklist.md` | Duplicates `BOB-DOCUMENTATION.md` Section 10 verification checklist |

## Files to UPDATE (3 files modified)

### 1. `BOB-DOCUMENTATION.md` — Trim duplicated sections

**Remove:**
- Section 7 ("Bob's Behaviour Guidelines") — this is now fully covered (and expanded with Brain logic) in `BOB-COMPLETE-PROCESS-FLOW.md`
- Section 11 ("Changelog Summary") — redundant with `CHANGELOG.md`

**Add:**
- A "Documentation Map" section at the top pointing to the other docs
- A cross-reference note where Section 7 was: "See `BOB-COMPLETE-PROCESS-FLOW.md` for Bob's personality, conversation states, Brain diagnostics, and customer interaction playbook."

**Keep intact:**
- Sections 1-6 (Overview, Quick Start, Integration, Props, Session Handoff, CSS)
- Section 8 (API Reference)
- Section 9 (Troubleshooting)
- Section 10 (3-Stage Installation) — this is the canonical installation guide

### 2. `README.md` (packages/bob-widget) — Add doc map, trim duplication

**Add** a "Documentation Map" table at the top:

| Document | What It Covers |
|----------|---------------|
| This README | Quick start, installation, container setup, callbacks |
| `BOB-DOCUMENTATION.md` | Full technical reference, props, troubleshooting, 3-stage install |
| `CHANGELOG.md` | Version history |
| `BOB-COMPLETE-PROCESS-FLOW.md` (project root) | Bob's personality, conversation states, Brain diagnostics, canned speech, customer playbook |

**No content removal** — README.md is the npm-facing document and needs to be self-contained for developers finding the package on npm.

### 3. `BOB-COMPLETE-PROCESS-FLOW.md` (root) — Add doc map header

**Add** a small "Related Documentation" section after the intro, pointing to:
- `packages/bob-widget/README.md` for integration/installation
- `packages/bob-widget/BOB-DOCUMENTATION.md` for technical reference
- `packages/bob-widget/CHANGELOG.md` for version history

## Summary of Changes

| Action | Count | Detail |
|--------|-------|--------|
| Files deleted | 4 | Legacy process flow + 3 duplicated install docs |
| Files updated | 3 | Cross-references added, duplicated sections removed |
| Files unchanged | 1 | CHANGELOG.md |
| Net result | 4 docs total (down from 8) | Clear ownership, no duplication |

## Technical Details

- All deletions are `.md` files only — no code changes
- The `install/carfix/` directory will retain its folder structure (it may still be referenced by the CLI installer binary in `bin/bob-widget.mjs`) but will be empty of markdown files
- The `BOB-PROCESS-FLOW.md` deletion is safe — the plan notes confirm the root document replaces it, and no code imports it

