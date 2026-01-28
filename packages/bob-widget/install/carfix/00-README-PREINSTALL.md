# Bob Widget v3.1.10 - CARFIX Installation Guide

> 🚨 **STOP - READ THIS FIRST**
>
> Bob v3.1.10 requires a **strict 3-stage installation process**. Skipping stages WILL cause visual issues (blur, wrong scale, wrong position).

## Overview

The 3-stage process ensures:
1. **Stage A**: No old code remains (forensic removal)
2. **Stage B**: Container is correctly configured (page preparation)
3. **Stage C**: Only the new version is installed and verified

## Quick Start (CLI)

```bash
# Stage A: Forensic Scan & Purge
npx @gymmymac/bob-widget carfix stage-a

# Stage B: Generate Page Template
npx @gymmymac/bob-widget carfix stage-b --target next-pages --output pages/ask-bob.tsx

# Stage C: Install & Verify
npx @gymmymac/bob-widget carfix stage-c --partner CARFIX
```

## What Each Stage Does

### Stage A: Forensic Removal

**Time: 2-5 minutes**

Scans for and removes:
- Bob component files (`Bob*.tsx`, `AskBob*.tsx`)
- Bob hook files (`useBob*.ts`)
- Bob type definitions (`*bob*.d.ts`)
- Bob imports in any file
- `BOB_` environment variables
- Cached packages

If issues are found, the script **exits with an error** and lists what to delete manually.

### Stage B: Page Preparation

**Time: 1 minute**

Generates a container page template for your framework:
- `next-pages` - Next.js Pages Router
- `next-app` - Next.js App Router
- `react-router` - React Router (Vite)

The template includes the correct container height calculation:
```css
height: calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))
```

### Stage C: Install & Verify

**Time: 1-2 minutes**

- Installs `@gymmymac/bob-widget@3.1.10`
- Verifies the installed version
- Tests backend connectivity
- Provides final code integration example

## Manual Scripts

If you prefer to run the stages manually, see:
- `01-stage-a-forensic-scan.sh` / `.ps1`
- `02-stage-a-cache-purge.sh` / `.ps1`
- `03-stage-b-generate-container-template.mjs`
- `04-stage-c-install-and-verify.mjs`

## Verification Checklist

After completing all stages, verify in browser:

| Test | Expected Result |
|------|-----------------|
| Console version | `[BobWidget] Package loaded - v3.1.10` |
| Bob visibility | Fully visible, not cropped |
| No blur | Background is NOT blurred |
| Correct scale | Bob is prominently sized |
| Chat works | Messages send and Bob responds |
| PTT (HTTPS) | Speech recognition activates |

## Support

For issues, check the troubleshooting section in `BOB-DOCUMENTATION.md`.
