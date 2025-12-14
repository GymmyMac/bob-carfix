export interface Vehicle {
  id?: string;
  user_id?: string;
  vehicle_id: string;
  rego: string;
  created_at?: string;
  make?: string;
  model?: string;
  year?: string | number;
  variant?: string;
  vehicle_name_nz?: string;
  engine_size?: string;
  fuel_type?: string;
  power?: string | number;
  vin?: string;
  engine_no?: string;
  cc_rating?: number;
}

export interface PastPurchase {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  purchased_at: string;
}
