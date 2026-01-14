export interface Product {
  id: string;
  sku: string;
  image: string;
  image_url?: string; // Widget compatibility - same as image
  brandImage?: string;
  name: string;
  partNumber: string;
  part_number?: string; // Snake_case alias for widget
  price: number;
  brand?: string;
  partslotDescription?: string;
  productUrl?: string;
  product_url?: string; // Snake_case alias for widget
}

/**
 * API response format from CARFIX retrieve-parts endpoint
 * 
 * CANONICAL FIELDS (preferred - from CARFIX API):
 * - sku: Product SKU (e.g., "A1303588")
 * - brand: Brand name (e.g., "RYCO")
 * - partslot_description: Part category (e.g., "OIL FILTER")
 * - part_number: Manufacturer part number
 * - price: Retail price (number)
 * - image_url: Product image URL
 * 
 * LEGACY FIELDS (for backward compatibility):
 * - SKU, Brand, Price, Image: PascalCase variants
 * - "Part Product Type", "Part Number", "Part No": Legacy naming
 * - "Metro Retail Price": Alternative price field
 */
export interface APIPart {
  // Canonical fields (preferred)
  sku?: string;
  brand?: string;
  partslot_description?: string;
  part_number?: string;
  price?: number;
  image_url?: string;
  
  // Legacy PascalCase variants
  SKU?: string;
  Brand?: string;
  Price?: number;
  Image?: string;
  
  // Legacy alternative field names
  "Part Product Type"?: string;
  "Part No"?: string;
  "Part Number"?: string;
  "Metro Retail Price"?: number;
  "In Stock"?: string;
}

// CARFIX storage base URLs (note: underscores in bucket names)
const CARFIX_IMAGE_BASE_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images";
const CARFIX_BRAND_IMAGE_BASE_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/brand_images";

/**
 * Convert CARFIX API part to display Product format
 * Prioritizes canonical field names, falls back to legacy variants
 */
export function apiPartToProduct(part: APIPart): Product {
  // Extract fields - prefer canonical names, fallback to legacy
  const sku = part.sku || part.SKU || '';
  const brand = part.brand || part.Brand || '';
  const partslotDesc = part.partslot_description || part["Part Product Type"] || '';
  const partNumber = part.part_number || part["Part Number"] || part["Part No"] || sku || '';
  const price = part.price || part["Metro Retail Price"] || part.Price || 0;
  
  // Image URL: prefer provided, construct from SKU as fallback
  const imageUrl = part.image_url || part.Image || (sku 
    ? `${CARFIX_IMAGE_BASE_URL}/${sku}.jpg`
    : "/placeholder.svg");
  
  // Brand image fallback
  const brandImageUrl = brand
    ? `${CARFIX_BRAND_IMAGE_BASE_URL}/${brand.replace(/\s+/g, '')}.jpg`
    : undefined;

  return {
    id: sku || partNumber || Math.random().toString(36),
    sku,
    image: imageUrl,
    image_url: imageUrl,
    brandImage: brandImageUrl,
    name: partslotDesc || "Auto Part",
    partNumber: partNumber || "N/A",
    part_number: partNumber || "N/A",
    price,
    brand,
    partslotDescription: partslotDesc
  };
}

export const PLACEHOLDER_PRODUCTS: Product[] = [
  {
    id: "1",
    sku: "OF-12345",
    image: "/placeholder.svg",
    name: "Oil Filter",
    partNumber: "OF-12345",
    price: 12.99
  },
  {
    id: "2",
    sku: "AF-67890",
    image: "/placeholder.svg",
    name: "Air Filter",
    partNumber: "AF-67890",
    price: 15.99
  },
  {
    id: "3",
    sku: "BP-11223",
    image: "/placeholder.svg",
    name: "Brake Pads",
    partNumber: "BP-11223",
    price: 45.99
  },
  {
    id: "4",
    sku: "SP-44556",
    image: "/placeholder.svg",
    name: "Spark Plugs",
    partNumber: "SP-44556",
    price: 8.99
  },
  {
    id: "5",
    sku: "WB-77889",
    image: "/placeholder.svg",
    name: "Wiper Blades",
    partNumber: "WB-77889",
    price: 19.99
  },
  {
    id: "6",
    sku: "BT-99001",
    image: "/placeholder.svg",
    name: "Battery",
    partNumber: "BT-99001",
    price: 89.99
  },
  {
    id: "7",
    sku: "CL-22334",
    image: "/placeholder.svg",
    name: "Coolant",
    partNumber: "CL-22334",
    price: 14.99
  },
  {
    id: "8",
    sku: "TF-55667",
    image: "/placeholder.svg",
    name: "Transmission Fluid",
    partNumber: "TF-55667",
    price: 22.99
  },
  {
    id: "9",
    sku: "HB-88990",
    image: "/placeholder.svg",
    name: "Headlight Bulbs",
    partNumber: "HB-88990",
    price: 24.99
  }
];
