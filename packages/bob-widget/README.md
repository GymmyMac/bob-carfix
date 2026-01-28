# @gymmymac/bob-widget

AI-powered automotive parts assistant widget for integration into partner websites.

**Current Version:** 3.1.8

---

## 🚨 IMPORTANT: Read Before Installing

**CARFIX Team:** Before integrating Bob, you MUST read the following documentation:

### 📖 Required Reading

| Document | Description |
|----------|-------------|
| **[BOB-DOCUMENTATION.md](./BOB-DOCUMENTATION.md)** | **Complete integration guide** - Contains CARFIX-specific installation steps, container height calculations (144px offset), forensic cleanup process, and verification tests. **START HERE.** |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and release notes |

### ⚠️ Critical Installation Notes

1. **Forensic Cleanup Required**: If upgrading from v3.0.x, you MUST run the cleanup script in BOB-DOCUMENTATION.md Section 10 before installing
2. **Container Height**: Bob requires `height: calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))` to display correctly with CARFIX header/footer
3. **HTTPS Required**: Push-to-Talk (PTT) requires HTTPS - will be disabled on HTTP connections

---

## Quick Start

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

## Installation

```bash
npm install @gymmymac/bob-widget@^3.1.8
```

## What's New in v3.1.6

- 📚 **Documentation Update**: Corrected CARFIX layout measurements (144px total offset)
- 🔧 **Installation Guide**: Added comprehensive 6-phase forensic cleanup process
- 📐 **Container Height**: Updated formula for notched device support

## What's New in v3.1.0+

- 🎯 **BobStandalone** - Auto-configures from database (4 lines to integrate)
- 🗄️ **Partner Config System** - All settings in `bob_partners` table
- 🎨 **CSS Variables** - Customizable blur, opacity, colors
- 🔍 **Debug Overlay** - Visual diagnostic tool
- 📦 **Simplified Callbacks** - Only 3 essential callbacks needed

## Dependencies

Only requires:
- `react` ^18.0.0
- `react-dom` ^18.0.0

All other dependencies are bundled.

## Support

For integration issues, check the troubleshooting section in [BOB-DOCUMENTATION.md](./BOB-DOCUMENTATION.md#11-troubleshooting-reference).

## License

MIT
