# Bob Widget v3.1.19 - Runtime Verification Checklist

> Complete this checklist after Stage C to confirm Bob is working correctly.

## Browser Console Checks

Open DevTools (F12) → Console tab:

- [ ] `[BobWidget] Package loaded - v3.1.19`
- [ ] `[BobStandalone] Initialized { version: "3.1.19", partner: "CARFIX", ... }`
- [ ] `[BobWidget] Partner config loaded: { partner: "CARFIX", ... }`
- [ ] No red error messages

## Network Tab Checks

Filter by `gjoguxzstsihhxvdgpto`:

- [ ] `bob_partners` query returns 200
- [ ] `bob_looks` query returns 200
- [ ] `animation_states` query returns 200
- [ ] `bob_animations` query returns 200
- [ ] `bob_backdrops` query returns 200

## Visual Checks

- [ ] **Bob Visibility**: Character is fully visible, not cropped at top or bottom
- [ ] **No Blur**: Background backdrop is NOT blurred (should be crisp)
- [ ] **Correct Scale**: Bob is prominently sized (~140% mobile scale)
- [ ] **Position**: Bob stands ON the counter overlay, not below it
- [ ] **Container**: Bob fills space between CARFIX header and bottom nav

## Functional Checks

- [ ] **Chat Input**: Type a message → Bob responds
- [ ] **PTT** (HTTPS only): Click microphone → speech recognition activates
- [ ] **Vehicle Lookup**: Enter REGO (e.g., "HZP550") → Vehicle info returned
- [ ] **Products**: Ask for parts → Products appear on shelf
- [ ] **Add to Cart**: Say "add to cart" → `onAddToCart` callback fires

## Common Issues

| Issue | Solution |
|-------|----------|
| Wrong version in console | Clear `.vite` cache, restart dev server |
| Background is blurred | Check CSS `--bob-blur-intensity` is 0 |
| Bob is tiny | Check `scale` value in `bob_animations` table |
| Bob is cropped | Container height not using 144px offset formula |
| No products loading | Check `vehicle_id` is numeric in session token |

## Pass/Fail

If all checks pass: ✅ **Bob is correctly installed**

If any check fails: See troubleshooting in `BOB-DOCUMENTATION.md` Section 9.
