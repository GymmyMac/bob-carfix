# @gymmymac/bob-widget

AI-powered automotive parts assistant widget for integration into partner websites.

**Current Version:** 3.1.10

---

## 🚨 STOP - RUN THE INSTALLER FIRST

Bob v3.1.10 includes an **executable 3-stage installer**. Do NOT skip this step.

```bash
# Stage A: Forensic Scan & Purge (removes old Bob code)
npx @gymmymac/bob-widget carfix stage-a

# Stage B: Generate Page Template (creates container)
npx @gymmymac/bob-widget carfix stage-b --target next-pages --output pages/ask-bob.tsx

# Stage C: Install & Verify (installs Bob + tests backend)
npx @gymmymac/bob-widget carfix stage-c --partner CARFIX
```

### 📖 Required Reading

| Document | Description |
|----------|-------------|
| **[BOB-DOCUMENTATION.md](./BOB-DOCUMENTATION.md)** | **Complete integration guide** - Contains CARFIX-specific installation steps, container height calculations, and verification tests. **START HERE.** |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and release notes |
| **[install/carfix/](./install/carfix/)** | Installer scripts and templates |

### ⚠️ Critical Installation Notes

1. **3-Stage Installation Process**: Bob v3.1.10 requires a strict 3-stage installation via CLI. See the commands above.
2. **Container Height**: Bob requires `height: calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))` for CARFIX header/footer
3. **HTTPS Required**: Push-to-Talk (PTT) requires HTTPS - will be disabled on HTTP connections
4. **No Background Blur**: v3.1.10 removes hardcoded blur - background is crisp by default

---

## Quick Start

After completing the 3-stage installation:

```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

<BobStandalone
  partner="CARFIX"
  sessionToken={sessionToken}
  onAddToCart={(item) => addToCart(item)}
  onNavigate={(url) => router.push(url)}
  onCheckout={(url) => window.location.href = url}
/>
```

**That's it!** Bob auto-configures from the database.

---

## What's New in v3.1.10

- 🛠️ **Executable CLI Installer**: Run `npx @gymmymac/bob-widget carfix stage-a|b|c`
- 🎨 **Fixed Visual Issues**: Removed hardcoded blur, fixed Bob positioning/scale
- 📦 **Full Package Distribution**: CLI, install scripts, and docs shipped in npm
- 🔧 **Embedded Mode Default**: BobStandalone now uses `inline` variant (container-respecting)
- 🔒 **Auth Isolation**: Unique storage keys prevent host-site auth collisions

## Dependencies

Only requires:
- `react` ^18.0.0
- `react-dom` ^18.0.0

All other dependencies are bundled.

## Support

For integration issues, check the troubleshooting section in [BOB-DOCUMENTATION.md](./BOB-DOCUMENTATION.md#9-troubleshooting).

## License

MIT
