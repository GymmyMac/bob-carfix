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
