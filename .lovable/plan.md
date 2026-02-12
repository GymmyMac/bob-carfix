## Rear Brake Service: Disc vs Drum Toggle

### The Problem

The Rear Brake Service package includes parts for **both** disc brakes (pads + rotors) **and** drum brakes (shoes + drums). No vehicle has both -- it's always one or the other. Currently all parts show together, which is confusing.

### The Solution

Add a simple **Disc / Drum toggle switch** in the Rear Brake Service package header area (below the description text). This toggle:

- Defaults to **Disc Brakes** (the more common modern setup)
- Filters the product list in each tier to show only the relevant parts
- Recalculates the tier total price to reflect only the filtered products
- Only appears for the "Rear Brake Service" package (detected by `pkg.id` or `pkg.title`)

### How It Works (Data Analysis)

The `partslotName` field on each product cleanly identifies which brake type it belongs to:


| partslotName          | Brake Type | Keep when...  |
| --------------------- | ---------- | ------------- |
| BRAKE PADS REAR       | Disc       | Toggle = Disc |
| DISC BRAKE ROTOR REAR | Disc       | Toggle = Disc |
| BRAKE SHOE REAR       | Drum       | Toggle = Drum |
| BRAKE DRUM REAR       | Drum       | Toggle = Drum |
| BRAKE FLUID           | Both       | Always show   |


Any product whose `partslotName` doesn't match the drum-specific keywords (SHOE, DRUM) passes through for Disc mode, and vice versa. Brake Fluid and any other non-brake-type-specific parts always show.

### UI Design

Below the package description, a compact toggle strip:

```text
[Disc Brakes (Pads + Rotors)]  |  [Drum Brakes (Shoes + Drums)]
```

- Styled as a segmented control with CARFIX blue for the active selection
- Small helper text: "Select your vehicle's rear brake type"

### Technical Changes

**File: `packages/bob-widget/src/components/mobile/ServicePackageDetailView.tsx**`

1. Add state: `const [rearBrakeType, setRearBrakeType] = useState<'disc' | 'drum'>('disc')`
2. Detect if this is a rear brake package: check if `pkg.id` contains "rear-brake" or `pkg.title` contains "Rear Brake"
3. Filter function applied to each tier's `products` array:
  - Disc mode: exclude products where `partslotName` includes "SHOE" or "DRUM" (but not "BRAKE DRUM" vs "DRUM BRAKE" -- we match on the word)
  - Drum mode: exclude products where `partslotName` includes "PAD" or "ROTOR"
4. Recalculate `totalPrice` as the sum of filtered products' `displayPrice` values
5. Render the toggle UI between the description and "Choose Your Value Level" header
6. Pass filtered products to the Add to Cart handler

**File: `src/components/ServicePackageDetailDialog.tsx**` (desktop version)

Same logic applied to the desktop dialog for consistency.

### Safety

- This is purely a **frontend filter** -- no API or data changes
- The toggle only appears on the Rear Brake Service package
- All original data remains intact; toggling between the two states shows the relevant products
- The filter uses `partslotName` string matching which is stable server-side data
- Brake Fluid and any future non-type-specific parts are never filtered out