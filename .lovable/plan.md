

# Bob v3.1.3 Production Readiness Verification Plan

## Phase 1: Code Robustness Fixes

### 1.1 Add HTTPS Validation for Speech Recognition
Add a check in `useSpeechRecognition.ts` to warn users when not on HTTPS:

```typescript
// In useSpeechRecognition.ts, inside useEffect
if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
  console.warn('[BobWidget] Speech recognition requires HTTPS. PTT will not work on HTTP.');
  setError('Voice input requires a secure connection (HTTPS)');
  setIsSupported(false);
}
```

### 1.2 Consolidate Debug Logging
Create a centralized debug utility that respects the `debug` prop/localStorage flag:

```typescript
// src/utils/bobLogger.ts
const isDebugEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('bob_debug') === 'true' || 
         new URLSearchParams(window.location.search).has('bob_debug');
};

export const bobLog = (...args: any[]) => {
  if (isDebugEnabled()) console.log('[BobWidget]', ...args);
};
```

Replace scattered `console.log('[BobWidget]...)` calls with `bobLog(...)`.

### 1.3 Verify Callback Type Alignment
Ensure `EssentialCallbacks.onAddToCart` shape in `types/partner.ts` matches what `Bob.tsx` passes to the host:

**Current in `partner.ts`:**
```typescript
onAddToCart?: (item: {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  sku?: string;
  brand?: string;
  image_url?: string;
  vehicle_id?: string;
}) => void;
```

**Confirm Bob.tsx passes this exact shape** (verified - it does).

## Phase 2: Database Configuration Verification

### 2.1 Verify `bob_partners` CARFIX Entry
Already verified - the configuration is correct:
- `partner_code`: CARFIX
- `allowed_origins`: Includes `https://*.lovableproject.com` for dev
- `default_bottom_offset`: 60 (matches CARFIX's ~68px bottom nav)
- `feature_flags`: TTS, speech recognition, service packages enabled
- `bob_supabase_url/key`: Correct credentials

### 2.2 Add CARFIX Production Origins
Before production deployment, add the production domain to `allowed_origins`:
- `https://carfix.co.nz` ✅ (already present)
- `https://www.carfix.co.nz` ✅ (already present)
- Any staging/preview domains CARFIX uses

### 2.3 Verify Pre-recorded Audio Clips
All 8 clips are configured with absolute URLs:
- greeting_welcome, greeting_returning, ask_rego, rego_searching
- parts_searching, no_parts_found, vehicle_not_found, checkout_ready

## Phase 3: Package Build Verification

### 3.1 Verify Bundle Includes All Dependencies
The `vite.config.ts` correctly:
- Bundles `@tanstack/react-query` (not externalized)
- Bundles `@supabase/supabase-js` (not externalized) - WAIT, this is externalized
- Externalizes only `react` and `react-dom` (peer dependencies)

**Issue Found:** `@supabase/supabase-js` is in `dependencies` but also in `rollupOptions.external`. This could cause issues if the host doesn't have Supabase installed.

**Fix:** Remove `@supabase/supabase-js` from external list OR add it to `peerDependencies`.

```typescript
// vite.config.ts - CURRENT (may cause issues)
external: [
  'react',
  'react-dom',
  '@supabase/supabase-js',  // Remove this line
]

// OR in package.json - move to peerDependencies
"peerDependencies": {
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "@supabase/supabase-js": "^2.84.0"  // Add this
}
```

### 3.2 Verify Type Definitions Export
The `vite-plugin-dts` is configured with `insertTypesEntry: true` - this should generate proper `.d.ts` files.

### 3.3 Verify CSS is Bundled
`cssCodeSplit: false` ensures all CSS is bundled into the main output.

## Phase 4: Integration Testing Checklist

Before CARFIX deploys, verify these scenarios work:

### 4.1 Initialization Tests
- [ ] Console shows `[BobWidget] Package loaded - v3.1.3`
- [ ] Console shows `[BobStandalone] Initialized { version: "3.1.3", partner: "CARFIX" }`
- [ ] Partner config loads successfully (no "Partner not found" error)
- [ ] Origin is allowed (no warning about blocked origin)

### 4.2 Visual Tests
- [ ] Bob character fully visible (not cut off at bottom)
- [ ] Counter overlay renders behind Bob
- [ ] Backdrop image visible with correct blur
- [ ] Chat drawer opens/closes smoothly

### 4.3 Audio Tests
- [ ] Greeting plays on page load (or on first interaction if autoplay blocked)
- [ ] Pre-recorded clips match the voice in dynamic TTS
- [ ] PTT button starts listening (HTTPS + mic permission)

### 4.4 Functional Tests
- [ ] Text input sends message to bob-chat
- [ ] Vehicle lookup returns results for valid REGO
- [ ] Parts load after vehicle identification
- [ ] Service packages display with tiers
- [ ] onAddToCart callback fires with correct item shape

## Phase 5: Version Bump and Publish

After fixes, bump version to 3.1.4:

1. Update `packages/bob-widget/package.json`: `"version": "3.1.4"`
2. Update `CHANGELOG.md` with fixes
3. Build: `cd packages/bob-widget && npm run build`
4. Verify dist folder contains `index.js`, `index.mjs`, `index.d.ts`, `style.css`
5. Publish: `npm publish --access public`

## Summary of Required Changes

| Priority | Change | File |
|----------|--------|------|
| HIGH | Remove `@supabase/supabase-js` from external OR add to peerDeps | vite.config.ts / package.json |
| MEDIUM | Add HTTPS validation warning for PTT | useSpeechRecognition.ts |
| LOW | Consolidate debug logging | Multiple files |
| LOW | Update CHANGELOG | CHANGELOG.md |

## Success Criteria

Bob v3.1.4 is production-ready when:
1. CARFIX can install with `npm install @gymmymac/bob-widget@3.1.4`
2. No console errors on initialization
3. All 4 functional test categories pass
4. PTT works on HTTPS with microphone permission
5. Products load after vehicle identification
6. onAddToCart callback fires correctly

