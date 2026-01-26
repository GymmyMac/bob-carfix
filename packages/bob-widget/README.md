# @gymmymac/bob-widget

AI-powered automotive parts assistant widget for integration into partner websites.

**Current Version:** 3.1.0

## Quick Start

```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

<BobStandalone
  partner="CARFIX"
  sessionToken={sessionToken}
  onAddToCart={(item) => addToCart(item)}
  onNavigate={(url) => router.push(url)}
/>
```

**That's it!** Bob auto-configures from the database.

## Documentation

📖 **[Full Documentation](./BOB-DOCUMENTATION.md)** - Complete integration guide, props reference, behaviour guidelines, and troubleshooting.

📋 **[Changelog](./CHANGELOG.md)** - Version history and release notes.

## Installation

```bash
npm install @gymmymac/bob-widget@^3.1.0
```

## What's New in v3.1.0

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

## License

MIT
