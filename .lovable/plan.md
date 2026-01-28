
## What’s actually going wrong (confirmed from the codebase + backend config)

### 1) Background blur is still “in play” (it’s hardcoded)
Your screenshot complaints are valid. In the bob-widget package **the background blur is currently hardcoded inside the mobile layouts**, independent of any “new install”:

- `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx`
  - backdrop uses: `filter: 'blur(4px) brightness(0.85)'` (always on)
- `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx`
  - backdrop uses: `filter: shouldBlurBackground ? 'blur(8px)...' : ...` (blur-on-state logic)
- `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx`
  - backdrop uses: `filter: shouldBlur ? 'blur(8px)' : 'none'`

So even if CARFIX does a perfect forensic cleanup, **the current published widget still can blur the backdrop** because blur is built into the widget itself.

### 2) Bob looks “small” and “out of position” due to a real math + data interaction
From the backend (Lovable Cloud DB) we verified:

- Active look: `V2 Bob` (look_id `bddd31eb-7e60-4467-aad3-e07783e3fbbd`)
- For that look, most frames have:
  - `scale = 100`
  - `vertical_offset = -5`
- Active backdrop has:
  - `counter_height_percent = 12`

But in `packages/bob-widget/src/components/mobile/MobileBobCharacter.tsx`, Bob’s bottom is computed as:

- `bottomPercent = counterHeightPercent - 2 + verticalOffset`
  - With counterHeightPercent=12 and verticalOffset=-5 → **bottomPercent = 5%**
  - That makes Bob sit visibly low / “off”.

This isn’t an “old install” artifact. It’s a **current formula + current DB offsets** mismatch.

### 3) The “standalone embedded widget” contract is not being honored by BobStandalone right now
`BobStandalone` currently renders:

- `<Bob variant="mobile" ... />`

And `mobile` variant uses `MobileBobLayout`, which uses **fixed positioning when embedded=false**. Even if CARFIX puts Bob inside a correctly sized container between header and bottom nav, a fixed-position mobile layout can still behave like a full-screen overlay and/or be clipped by host overflow rules—making Bob appear incorrectly sized/positioned.

So: **even if the CARFIX team follows the container-height rules perfectly, BobStandalone currently does not default to the contained/embedded layout that CARFIX needs.**

### 4) Why CARFIX didn’t see your “3-stage install process” docs/scripts
Your bob-widget package currently has:

- `packages/bob-widget/package.json` → `"files": ["dist"]`

That means when CARFIX installs from npm, the package will ship basically only `dist/**` (plus npm’s default inclusions like package.json/readme), and **not necessarily** the full `BOB-DOCUMENTATION.md` + any installer assets unless we explicitly include them.

So even though `packages/bob-widget/BOB-DOCUMENTATION.md` in this repo contains a Stage A/B/C section, CARFIX may not be receiving it in `node_modules/@gymmymac/bob-widget/` in a reliable way. Also: there are currently **no actual script files** in the package—only script text inside the docs—so there was nothing concrete to “run”.

This matches your report: “no clean up, no pre install readme file, no 3 stage install process”.

---

## Goal (what we will deliver)
A new release that includes:

1) **A true “Forensic 3-Stage Installer”** that CARFIX can run as commands (not just copied from docs), with:
   - **Stage A**: forensic detection + cache/package cleanup (safe; no auto-deleting arbitrary source files)
   - **Stage B**: page/container template generator (prints or writes templates)
   - **Stage C**: install + verification script (version + backend reachability + runtime checklist)

2) **Widget fixes** so CARFIX stops seeing:
   - background blur
   - small Bob
   - out-of-position Bob

3) **Documentation + installer files included in the npm package** with explicit paths so CARFIX can always find them.

We will publish this as **v3.1.10** (patch bump from 3.1.9; scoped to fixes + packaging).

---

## Deliverable A: “Install files” (names + locations) that CARFIX can actually execute

### A1) Add an install directory that ships in npm
Create a new directory in the widget package:

- `packages/bob-widget/install/carfix/`

Contents (concrete files, not just docs):

1. `packages/bob-widget/install/carfix/00-README-PREINSTALL.md`
   - What “forensic removal” means
   - What this installer can/can’t delete safely
   - Expected time + checklist

2. `packages/bob-widget/install/carfix/01-stage-a-forensic-scan.sh`
3. `packages/bob-widget/install/carfix/01-stage-a-forensic-scan.ps1`
   - Cross-platform scanning for:
     - any old Bob components/hooks/types
     - any imports of old bob-widget/legacy Bob paths
     - any `BOB_` env vars
     - duplicate widget installs
   - Exits non-zero if found, prints exact file paths + matching lines.

4. `packages/bob-widget/install/carfix/02-stage-a-cache-purge.sh`
5. `packages/bob-widget/install/carfix/02-stage-a-cache-purge.ps1`
   - Performs safe cleanup steps CARFIX asked for:
     - uninstall bob-widget packages (known names)
     - remove node_modules + lockfiles (optional flag)
     - remove build caches (.vite, .next/cache, dist, etc.)

6. `packages/bob-widget/install/carfix/03-stage-b-generate-container-template.mjs`
   - Generates templates to stdout (and optionally writes files) for:
     - Next.js Pages router
     - Next.js App router
     - React Router (Vite)
   - Includes the CARFIX “Header + Bottom Nav present; Bob container between them” requirement.

7. `packages/bob-widget/install/carfix/04-stage-c-install-and-verify.mjs`
   - Installs bob-widget (or validates already installed)
   - Verifies installed version matches target
   - Verifies Bob backend is reachable by:
     - reading the partner config row for CARFIX (public read)
     - confirming required fields exist (api_base_url, allowed_origins, etc.)
   - Prints a final “PASS/FAIL” summary.

8. `packages/bob-widget/install/carfix/05-runtime-verification-checklist.md`
   - The manual in-browser checks (console string, PTT, rego lookup, etc.)

### A2) Add an executable CLI so CARFIX can run Stage A/B/C as commands
Add a Node CLI entrypoint shipped in npm:

- `packages/bob-widget/bin/bob-widget.mjs` (or `.js`)
- Update `packages/bob-widget/package.json`:
  - add `"bin": { "bob-widget": "bin/bob-widget.mjs" }`
  - expand `"files"` to include:
    - `dist`
    - `install`
    - `bin`
    - `BOB-DOCUMENTATION.md`
    - `CHANGELOG.md`
    - `README.md`

This enables CARFIX to run the process the way you described (“triggered by npm file being run”), via:

- Stage A (before install, using npx):
  - `npx -y @gymmymac/bob-widget@3.1.10 bob-widget carfix stage-a`

- Stage B:
  - `npx -y @gymmymac/bob-widget@3.1.10 bob-widget carfix stage-b --target next-pages --output ./pages/ask-bob.tsx`

- Stage C:
  - `npx -y @gymmymac/bob-widget@3.1.10 bob-widget carfix stage-c --partner CARFIX`

This is the cleanest way to “run the install” without relying on copy/paste from docs.

---

## Deliverable B: Fix the widget so the screenshot issues stop happening

### B1) Remove hardcoded background blur and make blur purely config-driven
Changes:
- `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx`
  - Remove the hardcoded `blur(4px)` backdrop filter.
  - If blur is desired, use the already-injected CSS variable:
    - `blur(var(--bob-blur-intensity, 0px))`
  - For CARFIX, we will set blur intensity to 0 in partner config so it becomes “none”.

- `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx`
- `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx`
  - Same: no magic numbers like blur(8px), use config variable consistently, and allow 0.

### B2) Fix Bob’s vertical positioning math to match the “counter overlay” model
Change:
- `packages/bob-widget/src/components/mobile/MobileBobCharacter.tsx`
  - Replace:
    - `counterHeightPercent - 2 + verticalOffset`
  - With:
    - `counterHeightPercent + verticalOffset`
  - This aligns with the desktop `BobCharacter` logic and stops the “sinking Bob” issue when counterHeightPercent is 12.

### B3) Make BobStandalone actually behave as an embedded “standalone widget”
Change:
- `packages/bob-widget/src/components/BobStandalone.tsx`
  - Switch the default rendering from:
    - `variant="mobile"`
  - To:
    - `variant="inline"`
  - Reason: inline uses `ContainedMobileBobLayout` which is container-respecting and designed for header/footer pages.
  - Add a new `embedded?: boolean` prop to `StandaloneWidgetProps` (default true) only if still needed for other variants.

This change directly supports your requirement:
- “page with CARFIX header and bottom nav; container between them; Bob fills that container”

### B4) Reduce “old install interference” risks (auth storage collision) for true standalone behavior
Change:
- `packages/bob-widget/src/hooks/usePartnerConfig.ts`
- `packages/bob-widget/src/BobProvider.tsx`

When creating Supabase clients, set client options to avoid:
- storage key collisions with other clients on the host site
- persistent session behavior the widget doesn’t need

Implement:
- unique `storageKey` for widget clients (e.g., `bobwidget_${partnerCode}`)
- `persistSession: false`
- `autoRefreshToken: false`

This prevents the “multiple GoTrueClient instances” style of undefined behavior when partners have their own auth clients.

---

## Deliverable C: Update backend defaults so CARFIX gets the correct “no blur / correct offsets” out of the box

### C1) Update CARFIX partner defaults
In `public.bob_partners` for `partner_code='CARFIX'`:
- set `default_bottom_offset` to **72** (matches your CARFIX bottom nav spec)
- set `backdrop_blur_intensity` to **0** (your stated requirement: no background blur)

### C2) Fix look offsets so Bob isn’t being pushed downward by legacy negative offsets
For active look `bddd31eb-7e60-4467-aad3-e07783e3fbbd`:
- update `bob_animations.vertical_offset` from **-5** to **0** for the look
- (optional) if still visually small after the layout fixes, consider bumping `bob_animations.scale` from 100 → 110 for mobile-friendly presence

These updates are safe because scale/offset are explicitly database-driven tuning knobs.

---

## Documentation updates (so CARFIX can’t miss it again)

### D1) Update BOB-DOCUMENTATION.md to reference real files
- `packages/bob-widget/BOB-DOCUMENTATION.md`
  - In Section 10:
    - add a “Where the install scripts live” section with exact paths:
      - `node_modules/@gymmymac/bob-widget/install/carfix/...`
    - add the `npx bob-widget carfix stage-a|b|c` commands
    - keep the inline scripts as “reference”, but the source of truth becomes the shipped files.

### D2) Update README.md to act as the unavoidable “pre-install” gate
- `packages/bob-widget/README.md`
  - Add a bold “STOP: Run installer first” section with:
    - the npx commands
    - the file paths inside node_modules

---

## Versioning / Release
- Bump version everywhere from **3.1.9 → 3.1.10**
  - `packages/bob-widget/package.json`
  - `packages/bob-widget/src/version.ts`
  - `packages/bob-widget/README.md`
  - `packages/bob-widget/BOB-DOCUMENTATION.md`
  - `packages/bob-widget/CHANGELOG.md`

---

## Verification (how we will prove it’s fixed)

### Widget runtime verification (visual)
1) Install in a constrained container (height calc) and ensure:
- backdrop has no blur (computed filter contains `blur(0px)` or `none`)
- Bob stands on the counter correctly (not at ~5% bottom)
- Bob is properly sized (subjective but clearly “prominent”)

### Installer verification (Stage A/B/C)
- Stage A:
  - intentionally add a fake “legacy Bob import” → installer must fail with file + line location
- Stage B:
  - generator must output correct container code + explicit header/bottom-nav context comments
- Stage C:
  - must print installed version and “partner config reachable: PASS”

### Regression guard
- Add a Playwright test (repo already uses Playwright) to assert:
  - no hardcoded blur values exist in rendered backdrop (or filter uses CSS var)
  - BobStandalone renders inline/contained layout by default

---

## What you will get (explicit list you requested)
After implementation, CARFIX will have:

### In the npm package (node_modules)
- `node_modules/@gymmymac/bob-widget/BOB-DOCUMENTATION.md`
- `node_modules/@gymmymac/bob-widget/install/carfix/00-README-PREINSTALL.md`
- `node_modules/@gymmymac/bob-widget/install/carfix/01-stage-a-forensic-scan.sh`
- `node_modules/@gymmymac/bob-widget/install/carfix/01-stage-a-forensic-scan.ps1`
- `node_modules/@gymmymac/bob-widget/install/carfix/02-stage-a-cache-purge.sh`
- `node_modules/@gymmymac/bob-widget/install/carfix/02-stage-a-cache-purge.ps1`
- `node_modules/@gymmymac/bob-widget/install/carfix/03-stage-b-generate-container-template.mjs`
- `node_modules/@gymmymac/bob-widget/install/carfix/04-stage-c-install-and-verify.mjs`
- `node_modules/@gymmymac/bob-widget/install/carfix/05-runtime-verification-checklist.md`
- `node_modules/@gymmymac/bob-widget/bin/bob-widget.mjs` (CLI)

### Commands CARFIX runs (single source of truth)
- Stage A (forensic removal gate):
  - `npx -y @gymmymac/bob-widget@3.1.10 bob-widget carfix stage-a`
- Stage B (page/container prep):
  - `npx -y @gymmymac/bob-widget@3.1.10 bob-widget carfix stage-b --target <next-pages|next-app|react-router> --output <path>`
- Stage C (install + verify):
  - `npx -y @gymmymac/bob-widget@3.1.10 bob-widget carfix stage-c --partner CARFIX`

This is the “npm-triggered 3-stage install” you described, with real files, real locations, and enforceable gating.

