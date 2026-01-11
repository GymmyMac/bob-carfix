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

// API response format from retrieve-parts - handles both snake_case and PascalCase
export interface APIPart {
  SKU?: string;
  sku?: string;
  "Part Product Type"?: string;
  partslot_description?: string;
  Brand?: string;
  brand?: string;
  "Part No"?: string;
  "Part Number"?: string;
  part_number?: string;
  "In Stock"?: string;
  Price?: number;
  price?: number;
  "Metro Retail Price"?: number;
  Image?: string;
  image_url?: string;
}

// CARFIX storage base URLs (note: underscores in bucket names)
const CARFIX_IMAGE_BASE_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images";
const CARFIX_BRAND_IMAGE_BASE_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/brand_images";

// Convert API part to display format - handles snake_case and PascalCase field names
export function apiPartToProduct(part: APIPart): Product {
  // Handle both snake_case and PascalCase field names
  const sku = part.SKU || part.sku || '';
  const brand = part.Brand || part.brand || '';
  const partType = part["Part Product Type"] || part.partslot_description || '';
  const partNumber = part["Part Number"] || part["Part No"] || part.part_number || sku || '';
  const price = part["Metro Retail Price"] || part.Price || part.price || 0;
  const partslotDesc = part.partslot_description || part["Part Product Type"] || '';
  
  // Primary image: use provided image_url or construct from SKU
  const imageUrl = part.image_url || part.Image || (sku 
    ? `${CARFIX_IMAGE_BASE_URL}/${sku}.jpg`
    : "/placeholder.svg");
  
  // Fallback: brand image (remove spaces from brand name)
  const brandImageUrl = brand
    ? `${CARFIX_BRAND_IMAGE_BASE_URL}/${brand.replace(/\s+/g, '')}.jpg`
    : undefined;

  const product: Product = {
    id: sku || partNumber || Math.random().toString(36),
    sku,
    image: imageUrl,
    image_url: imageUrl, // Widget compatibility
    brandImage: brandImageUrl,
    name: partType || "Auto Part",
    partNumber: partNumber || "N/A",
    part_number: partNumber || "N/A", // Widget compatibility
    price,
    brand,
    partslotDescription: partslotDesc
  };
  
  // Debug log for first product
  if (typeof window !== 'undefined' && (window as any).__PRODUCT_DEBUG_LOGGED !== true) {
    console.log('[apiPartToProduct] Sample transform:', { input: part, output: product });
    (window as any).__PRODUCT_DEBUG_LOGGED = true;
  }
  
  return product;
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
