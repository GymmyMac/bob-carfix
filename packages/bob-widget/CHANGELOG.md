# Changelog

All notable changes to the `@gymmymac/bob-widget` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
