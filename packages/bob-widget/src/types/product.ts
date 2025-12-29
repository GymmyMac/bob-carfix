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
  partslotDescription?: string;
  image_url?: string;
  quantity?: number;
}

export interface APIPart {
  SKU?: string;
  sku?: string;
  "Part Product Type"?: string;
  partslot_description?: string;
  Brand?: string;
  brand?: string;
  "Part Number"?: string;
  part_number?: string;
  "Metro Retail Price"?: number;
  price?: number;
  "Per Car Qty"?: number;
  per_car_qty?: number;
  vehicle_id?: number;
  volume?: string | null;
  viscosity?: string | null;
  image_url?: string;
  web_description?: string | null;
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
}
