# Changelog

All notable changes to the `@gymmymac/bob-widget` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-01-26

### Added
- **BobStandalone Component**: New simplified integration component that auto-configures from database
- **Partner Config System**: `bob_partners` database table stores all partner-specific settings
- **usePartnerConfig Hook**: Auto-loads partner configuration including API URLs, layout defaults, and feature flags
- **BobDebugOverlay Component**: Visual diagnostic overlay for integration troubleshooting
- **CSS Variables**: Customizable `--bob-blur-intensity`, `--bob-overlay-opacity`, `--bob-primary-color`
- **sessionToken Prop**: Support for pre-authenticated sessions on Bob and BobStandalone components

### Changed
- **Integration Complexity**: Reduced from 30+ lines to 4 lines of code for CARFIX
- **Callback Model**: Simplified to 3 essential callbacks (`onAddToCart`, `onNavigate`, `onCheckout`)
- **Config Model**: All configuration now auto-loaded from `bob_partners` table

### Documentation
- Complete rewrite of CARFIX-INTEGRATION.md for v3.1.0
- Migration guide from v3.0.x to v3.1.0

## [3.0.6] - 2026-01-24

### Changed
- **Release Process Fix**: Corrected GitHub tag/version sync from v3.0.5 release attempt
- **Documentation Consolidation**: Incorporated CARFIX integration feedback into all guides
- **Version References**: Updated all documentation to reflect current stable release

## [3.0.5] - 2026-01-24

### Added
- **Animation State Manifest**: Complete state documentation for CARFIX integration (`idle`, `waving`, `talking`, `researching`, `listening`, `showing_product`)
- **TTS Configuration Guide**: Documented hybrid audio system (pre-recorded clips → ElevenLabs → Google TTS fallback)
- **Backend Infrastructure Checklist**: Verification guide for external installations

### Changed
- Improved CARFIX-INTEGRATION.md with complete troubleshooting section
- Enhanced documentation for animation state naming conventions (`talking` vs `talk` mapping)
- Updated version compatibility matrix for external site deployments

## [3.0.4] - 2026-01-24

### Added
- **Animation Health Check**: New `useBobHealthCheck` hook for diagnosing animation system connectivity on external sites
- **Enhanced Diagnostics**: Console logging now reports loaded states, frame counts, and warns about missing critical states (`idle`, `talking`, `listening`)

### Changed
- Improved animation data loading logs for easier CARFIX integration debugging

## [3.0.3] - 2026-01-23
- **Database Migration**: Added `counter_overlay_url` to active backdrop record pointing to `bob-images` storage bucket

## [3.0.2] - 2026-01-23

### Fixed
- **External Audio Hosting**: Audio clips now use absolute Supabase Storage URLs instead of relative paths, fixing silent audio on external host sites like CARFIX
- **CSS Isolation**: Strengthened widget-reset.css to prevent host site styles from bleeding into Bob's glassmorphism UI
- **Debug Logging**: Added initialization logging to help diagnose variant and config issues when embedded on external sites

## [3.0.1] - 2026-01-23

### Fixed
- **TTS Voice ID Validation**: Added validation to ensure only Google Cloud TTS voice formats (e.g., `en-AU-Neural2-B`) are used by the `bob-tts` edge function
- Prevents 400 Bad Request errors when ElevenLabs voice IDs are stored in database settings
- Automatic fallback to default Google voice when invalid voice format detected

## [3.0.0] - 2026-01-22

### Added
- **SwipeableBob Component**: Gesture-based interactions allowing users to swipe Bob in/out of view
- **Multi-Tenant Support**: Configurable looks and animations per tenant
- **RAF Animation System**: Rebuilt animation engine using `requestAnimationFrame` for smoother transitions
- **MatrixProductLoader**: Phased loading states with cyberpunk-style matrix rain effect
- **SparkDealBanner**: Animated promotional banner component with rotating deals
- **ServicePackageDetailView**: Mobile-optimized service package details
- **ContainedMobileBobLayout**: Self-contained mobile layout for iframe embedding
- **useReturningUser Hook**: Detects returning visitors for personalized greetings
- **useThemeSettings Hook**: Dynamic theme configuration from database
- **useSparkDeals Hook**: Fetches and manages promotional deals
- **usePositionFactors Hook**: Device-specific positioning for responsive layouts
- **Debug Utilities**: `bobLog`, `bobWarn`, `bobError` for conditional logging

### Changed
- **Animation System**: Complete rewrite using `requestAnimationFrame` instead of `setInterval`
- **Speech Synthesis**: Enhanced with duplicate greeting prevention and audio clip caching
- **Mobile Layout**: Improved with swipeable drawer and better product column layouts
- **Product Badges**: Redesigned to match CARFIX website styling
- **Chat Interface**: Better message rendering with inline product suggestions

### Fixed
- Double greeting playback on page load
- Animation data loading race conditions
- Speech synthesis queue management
- Mobile viewport detection edge cases
- Product tile hover states

### Performance
- Reduced bundle size by optimizing imports
- Improved animation frame rates
- Added React Query caching for animation data
- Lazy loading for heavy components

## [2.0.0] - 2025-12-01

### Added
- GA4 Analytics integration with comprehensive event tracking
- BobWidget self-contained component (bundles QueryClientProvider)
- Bottom offset support for host navigation bars
- z-index configuration for overlay management

### Changed
- Bundled `@tanstack/react-query` internally
- Improved TypeScript type exports

## [1.4.0] - 2025-11-15

### Added
- Redesigned PTT button: 3x larger, green "TALK" text, floating cartoon style

## [1.3.1] - 2025-11-01

### Added
- `bottomOffset` prop for positioning above host navigation bars
- `zIndexBase` prop for z-index control

## [1.3.0] - 2025-10-15

### Added
- GA4 Analytics integration with `ga4Config` prop
- Analytics event tracking for user interactions

## [1.2.0] - 2025-09-01

### Added
- Initial public release
- BobProvider context system
- Bob character animations
- Chat interface with speech synthesis
- Product suggestions component
