

# Prepare Bob Widget v3.1.19 for npm Export

## Current State Analysis

### Version Discrepancy Found
| File | Version |
|------|---------|
| `package.json` | `3.1.18` |
| `src/version.ts` fallback | `3.1.19` |
| `bin/bob-widget.mjs` | `3.1.11` (hardcoded) |
| `BOB-DOCUMENTATION.md` | `3.1.11` |
| `install/carfix/05-runtime-verification-checklist.md` | `3.1.10` |

All version references need to be aligned to **3.1.19** before export.

---

## 3-Phase Installation Process (Confirmed Working)

The CLI installer at `bin/bob-widget.mjs` is fully functional:

```bash
# Stage A: Forensic scan + cache purge
npx @gymmymac/bob-widget carfix stage-a

# Stage B: Generate container template
npx @gymmymac/bob-widget carfix stage-b --target next-pages --with-layout

# Stage C: Install + verify backend connectivity
npx @gymmymac/bob-widget carfix stage-c --partner CARFIX
```

**What each stage does:**
- **Stage A**: Scans for legacy Bob files, imports, env vars → purges node_modules/caches
- **Stage B**: Generates page template with 144px offset formula + optional layout components
- **Stage C**: Installs the package, verifies version, tests backend connectivity

---

## Pre-Export Checklist

### 1. Version Synchronisation (5 files)

| File | Action |
|------|--------|
| `packages/bob-widget/package.json` | Change `"version": "3.1.18"` → `"3.1.19"` |
| `packages/bob-widget/src/version.ts` | Already has `3.1.19` fallback - OK |
| `packages/bob-widget/bin/bob-widget.mjs` line 21 | Change `const VERSION = '3.1.11'` → `'3.1.19'` |
| `packages/bob-widget/BOB-DOCUMENTATION.md` | Replace all `3.1.11` references with `3.1.19` |
| `packages/bob-widget/install/carfix/05-runtime-verification-checklist.md` | Replace `3.1.10` → `3.1.19` |

### 2. CHANGELOG Update

Add new entry for v3.1.19 documenting:
- Vehicle variant deduplication (parts-relevant specs filtering)
- Registration/REGO terminology alignment
- Variant card display format fix (specs-first, no characterization)
- Bob speech count alignment with deduplicated UI

### 3. Package Contents Verification

The `files` array in package.json includes everything needed:
```json
"files": [
  "dist",           // Built bundles (ESM + CJS + types)
  "bin",            // CLI installer (bob-widget.mjs)
  "install",        // CARFIX installation scripts
  "BOB-DOCUMENTATION.md",
  "CHANGELOG.md",
  "README.md"
]
```

---

## GitHub Release Process

### Step 1: Commit Version Bump
After the version sync changes are applied, commit with message:
```
chore(bob-widget): bump version to 3.1.19 for npm release
```

### Step 2: Create GitHub Release
1. Go to GitHub → Releases → Draft new release
2. **Tag**: `v3.1.19` (must match package.json exactly)
3. **Title**: `Bob Widget v3.1.19`
4. **Notes**: Copy from CHANGELOG

### Step 3: Automatic npm Publish
The GitHub Action `.github/workflows/publish-package.yml` will:
1. Verify tag matches package.json version
2. Skip if already published
3. Install dependencies in `packages/bob-widget`
4. Build with Vite (creates dist/)
5. Verify dist/index.mjs, dist/index.js, and .d.ts exist
6. Publish to npm using `NPM_TOKEN` secret

---

## Technical Details

### Build Output Verification
The workflow verifies these files exist before publishing:
- `dist/index.mjs` (ESM bundle)
- `dist/index.js` (CJS bundle)
- `dist/*.d.ts` (TypeScript declarations)
- `dist/style.css` (optional - may be inlined)

### Package Exports Configuration
```json
"exports": {
  ".": {
    "import": "./dist/index.mjs",
    "require": "./dist/index.js",
    "types": "./dist/index.d.ts"
  }
}
```

### Required GitHub Secret
The workflow uses `NPM_TOKEN` for authentication. This must be configured in:
**GitHub → Repository Settings → Secrets → Actions → `NPM_TOKEN`**

---

## CARFIX Integration Steps (After npm Publish)

Once `@gymmymac/bob-widget@3.1.19` is published, the CARFIX team runs:

```bash
# 1. Clean slate
npx @gymmymac/bob-widget carfix stage-a

# 2. Generate container (they likely have header/nav already)
npx @gymmymac/bob-widget carfix stage-b --target next-pages

# 3. Install and verify
npx @gymmymac/bob-widget carfix stage-c --partner CARFIX
```

Then add to their page:
```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

<BobStandalone
  partner="CARFIX"
  sessionToken={sessionToken}
  onAddToCart={(item) => addToCart(item)}
  onNavigate={(url) => router.push(url)}
/>
```

---

## Summary of Changes Required

1. **Sync versions** to 3.1.19 across 5 files
2. **Add CHANGELOG entry** for v3.1.19 features
3. **Commit and push** to GitHub
4. **Create GitHub Release** with tag `v3.1.19`
5. **Verify npm publish** succeeded via workflow logs

