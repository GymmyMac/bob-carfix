/**
 * Extended Product type for the Bob widget
 */
export interface Product {
  id: string;
  name: string;
  brand?: string;
  price: number;
  sku?: string;
  partNumber?: string;
  part_number?: string; // alias for external/legacy payloads
  productUrl?: string;
  product_url?: string; // alias for external/legacy payloads
  partslotDescription?: string;
  image_url?: string;
  image?: string; // Alias for demo compatibility
  quantity?: number;
}

/**
 * API response format from CARFIX retrieve-parts endpoint
 * 
 * CANONICAL FIELDS (preferred):
 * - sku, brand, partslot_description, part_number, price, image_url
 * 
 * LEGACY FIELDS (backward compatibility):
 * - SKU, Brand, Price, Image, "Part Product Type", "Part Number", "Metro Retail Price"
 */
export interface APIPart {
  // Canonical fields
  sku?: string;
  brand?: string;
  partslot_description?: string;
  part_number?: string;
  price?: number;
  image_url?: string;
  per_car_qty?: number;
  vehicle_id?: number;
  volume?: string | null;
  viscosity?: string | null;
  web_description?: string | null;
  
  // Legacy PascalCase variants
  SKU?: string;
  Brand?: string;
  Price?: number;
  "Part Product Type"?: string;
  "Part Number"?: string;
  "Metro Retail Price"?: number;
  "Per Car Qty"?: number;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  vehicle_id?: string;
  sku?: string;
  brand?: string;
  image_url?: string;
}

export interface ServicePackage {
  id: string;
  title: string;
  description: string;
  from_price: number;
  partslots?: unknown[];
  icon_url?: string; // Custom icon image URL for premium display
}
