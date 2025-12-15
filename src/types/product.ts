export interface Product {
  id: string;
  sku: string;
  image: string;
  brandImage?: string;
  name: string;
  partNumber: string;
  price: number;
  inStock: boolean;
  brand?: string;
  partslotDescription?: string;
}

// API response format from retrieve-parts
export interface APIPart {
  SKU: string;
  "Part Product Type": string;
  Brand: string;
  "Part No"?: string;
  "Part Number"?: string;
  "In Stock"?: string;
  Price?: number;
  "Metro Retail Price"?: number;
  Image?: string;
  partslot_description?: string;
}

// CARFIX storage base URLs (note: underscores in bucket names)
const CARFIX_IMAGE_BASE_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images";
const CARFIX_BRAND_IMAGE_BASE_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/brand_images";

// Convert API part to display format
export function apiPartToProduct(part: APIPart): Product {
  const sku = part.SKU || '';
  const brand = part.Brand || '';
  
  // Primary image: product image by SKU
  const imageUrl = sku 
    ? `${CARFIX_IMAGE_BASE_URL}/${sku}.jpg`
    : "/placeholder.svg";
  
  // Fallback: brand image (remove spaces from brand name)
  const brandImageUrl = brand
    ? `${CARFIX_BRAND_IMAGE_BASE_URL}/${brand.replace(/\s+/g, '')}.jpg`
    : undefined;

  return {
    id: sku || part["Part Number"] || part["Part No"] || Math.random().toString(36),
    sku,
    image: imageUrl,
    brandImage: brandImageUrl,
    name: part["Part Product Type"] || "Auto Part",
    partNumber: part["Part Number"] || part["Part No"] || sku || "N/A",
    price: part["Metro Retail Price"] || part.Price || 0,
    inStock: true,
    brand,
    partslotDescription: part.partslot_description
  };
}

export const PLACEHOLDER_PRODUCTS: Product[] = [
  {
    id: "1",
    sku: "OF-12345",
    image: "/placeholder.svg",
    name: "Oil Filter",
    partNumber: "OF-12345",
    price: 12.99,
    inStock: true
  },
  {
    id: "2",
    sku: "AF-67890",
    image: "/placeholder.svg",
    name: "Air Filter",
    partNumber: "AF-67890",
    price: 15.99,
    inStock: true
  },
  {
    id: "3",
    sku: "BP-11223",
    image: "/placeholder.svg",
    name: "Brake Pads",
    partNumber: "BP-11223",
    price: 45.99,
    inStock: true
  },
  {
    id: "4",
    sku: "SP-44556",
    image: "/placeholder.svg",
    name: "Spark Plugs",
    partNumber: "SP-44556",
    price: 8.99,
    inStock: false
  },
  {
    id: "5",
    sku: "WB-77889",
    image: "/placeholder.svg",
    name: "Wiper Blades",
    partNumber: "WB-77889",
    price: 19.99,
    inStock: true
  },
  {
    id: "6",
    sku: "BT-99001",
    image: "/placeholder.svg",
    name: "Battery",
    partNumber: "BT-99001",
    price: 89.99,
    inStock: true
  },
  {
    id: "7",
    sku: "CL-22334",
    image: "/placeholder.svg",
    name: "Coolant",
    partNumber: "CL-22334",
    price: 14.99,
    inStock: true
  },
  {
    id: "8",
    sku: "TF-55667",
    image: "/placeholder.svg",
    name: "Transmission Fluid",
    partNumber: "TF-55667",
    price: 22.99,
    inStock: true
  },
  {
    id: "9",
    sku: "HB-88990",
    image: "/placeholder.svg",
    name: "Headlight Bulbs",
    partNumber: "HB-88990",
    price: 24.99,
    inStock: true
  }
];
