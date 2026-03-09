/**
 * Rear Brake Service: Disc vs Drum filter utility
 * Used by mobile ServicePackageDetailView
 */

export type RearBrakeType = 'disc' | 'drum';

const DRUM_KEYWORDS = ['SHOE', 'DRUM'];
const DISC_KEYWORDS = ['PAD', 'ROTOR'];

export function isRearBrakePackage(pkg: { id?: string; title?: string }): boolean {
  const id = pkg.id?.toLowerCase() || '';
  const title = pkg.title?.toLowerCase() || '';
  return id.includes('rear-brake') || title.includes('rear brake');
}

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

export function recalcTierTotal<T extends { displayPrice: number }>(products: T[]): number {
  return products.reduce((sum, p) => sum + p.displayPrice, 0);
}

export function detectAvailableBrakeTypes<T extends { partslotName: string; displayPrice: number }>(
  tiers: Array<{ products: T[] }>
): { hasDisc: boolean; hasDrum: boolean } {
  const allProducts = tiers.flatMap(t => t.products);
  const hasDisc = allProducts.some(p => {
    const name = p.partslotName.toUpperCase();
    return p.displayPrice > 0 && DISC_KEYWORDS.some(kw => name.includes(kw));
  });
  const hasDrum = allProducts.some(p => {
    const name = p.partslotName.toUpperCase();
    return p.displayPrice > 0 && DRUM_KEYWORDS.some(kw => name.includes(kw));
  });
  return { hasDisc, hasDrum };
}
