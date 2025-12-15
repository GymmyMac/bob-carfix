export interface Product {
  id: string;
  image: string;
  name: string;
  partNumber: string;
  price: number;
  inStock: boolean;
  brand?: string;
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
}

// CARFIX storage base URL for product images
const CARFIX_IMAGE_BASE_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product-images";

// Convert API part to display format
export function apiPartToProduct(part: APIPart): Product {
  // Construct image URL from SKU
  const imageUrl = part.SKU 
    ? `${CARFIX_IMAGE_BASE_URL}/${part.SKU}.jpg`
    : "/placeholder.svg";

  return {
    id: part.SKU || part["Part Number"] || part["Part No"] || Math.random().toString(36),
    image: imageUrl,
    name: part["Part Product Type"] || "Auto Part",
    partNumber: part["Part Number"] || part["Part No"] || part.SKU || "N/A",
    price: part["Metro Retail Price"] || part.Price || 0,
    inStock: true,
    brand: part.Brand
  };
}

export const PLACEHOLDER_PRODUCTS: Product[] = [
  {
    id: "1",
    image: "/placeholder.svg",
    name: "Oil Filter",
    partNumber: "OF-12345",
    price: 12.99,
    inStock: true
  },
  {
    id: "2",
    image: "/placeholder.svg",
    name: "Air Filter",
    partNumber: "AF-67890",
    price: 15.99,
    inStock: true
  },
  {
    id: "3",
    image: "/placeholder.svg",
    name: "Brake Pads",
    partNumber: "BP-11223",
    price: 45.99,
    inStock: true
  },
  {
    id: "4",
    image: "/placeholder.svg",
    name: "Spark Plugs",
    partNumber: "SP-44556",
    price: 8.99,
    inStock: false
  },
  {
    id: "5",
    image: "/placeholder.svg",
    name: "Wiper Blades",
    partNumber: "WB-77889",
    price: 19.99,
    inStock: true
  },
  {
    id: "6",
    image: "/placeholder.svg",
    name: "Battery",
    partNumber: "BT-99001",
    price: 89.99,
    inStock: true
  },
  {
    id: "7",
    image: "/placeholder.svg",
    name: "Coolant",
    partNumber: "CL-22334",
    price: 14.99,
    inStock: true
  },
  {
    id: "8",
    image: "/placeholder.svg",
    name: "Transmission Fluid",
    partNumber: "TF-55667",
    price: 22.99,
    inStock: true
  },
  {
    id: "9",
    image: "/placeholder.svg",
    name: "Headlight Bulbs",
    partNumber: "HB-88990",
    price: 24.99,
    inStock: true
  }
];
