/**
 * Rear Brake Service: Disc vs Drum filter utility
 * Shared between desktop (ServicePackageDetailDialog) and mobile (ServicePackageDetailView)
 */

export type RearBrakeType = 'disc' | 'drum';

const DRUM_KEYWORDS = ['SHOE', 'DRUM'];
const DISC_KEYWORDS = ['PAD', 'ROTOR'];

/**
 * Check if a service package is a rear brake package
 */
export function isRearBrakePackage(pkg: { id?: string; title?: string }): boolean {
  const id = pkg.id?.toLowerCase() || '';
  const title = pkg.title?.toLowerCase() || '';
  return id.includes('rear-brake') || title.includes('rear brake');
}

/**
 * Filter products based on selected brake type.
 * - Disc mode: exclude SHOE/DRUM partslots
 * - Drum mode: exclude PAD/ROTOR partslots
 * - Neutral parts (e.g. BRAKE FLUID) always pass through
 */
export function filterByBrakeType<T extends { partslotName: string }>(
  products: T[],
  brakeType: RearBrakeType
): T[] {
  const excludeKeywords = brakeType === 'disc' ? DRUM_KEYWORDS : DISC_KEYWORDS;
  return products.filter(p => {
    const name = p.partslotName.toUpperCase();
    return !excludeKeywords.some(kw => name.includes(kw));
  });
}

/**
 * Recalculate tier total from filtered products' displayPrice
 */
export function recalcTierTotal<T extends { displayPrice: number }>(products: T[]): number {
  return products.reduce((sum, p) => sum + p.displayPrice, 0);
}

/**
 * Detect which brake types have real products in the tier data.
 * Used to conditionally show/hide the Disc/Drum toggle.
 */
export function detectAvailableBrakeTypes<T extends { partslotName: string; displayPrice: number }>(
  tiers: Array<{ products: T[] }>
): { hasDisc: boolean; hasDrum: boolean } {
  const allProducts = tiers.flatMap(t => t.products);
  const hasDisc = allProducts.some(p => {
    const name = p.partslotName.toUpperCase();
    return DISC_KEYWORDS.some(kw => name.includes(kw));
  });
  const hasDrum = allProducts.some(p => {
    const name = p.partslotName.toUpperCase();
    return DRUM_KEYWORDS.some(kw => name.includes(kw));
  });
  return { hasDisc, hasDrum };
}
