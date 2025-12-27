/**
 * Vehicle types for the Bob widget
 */

export interface Vehicle {
  id?: number;
  vehicle_id?: number | string;
  rego?: string;
  make?: string;
  model?: string;
  year?: string | number;
  variant?: string;
  engine_size?: string;
  cc_rating?: number;
  fuel_type?: string;
  vin?: string;
  engine_no?: string;
  vehicle_name_nz?: string;
  body_style?: string;
}
