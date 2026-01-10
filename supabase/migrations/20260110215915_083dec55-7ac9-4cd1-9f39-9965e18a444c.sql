-- ============================================================================
-- BOB v3.0 PHASE 5+6: Multi-Tenant Database Schema
-- Creates bob_tenants, bob_llm_config, and bob_api_config tables
-- ============================================================================

-- Create bob_tenants table for multi-tenant support
CREATE TABLE public.bob_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  domain TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on bob_tenants
ALTER TABLE public.bob_tenants ENABLE ROW LEVEL SECURITY;

-- RLS policies for bob_tenants
CREATE POLICY "Anyone can view tenants" ON public.bob_tenants
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tenants" ON public.bob_tenants
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tenants" ON public.bob_tenants
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tenants" ON public.bob_tenants
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create bob_llm_config table for LLM provider abstraction
CREATE TABLE public.bob_llm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.bob_tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lovable',
  model TEXT DEFAULT 'google/gemini-2.5-flash',
  api_key_secret_name TEXT,
  endpoint TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on bob_llm_config
ALTER TABLE public.bob_llm_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for bob_llm_config
CREATE POLICY "Anyone can view llm config" ON public.bob_llm_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert llm config" ON public.bob_llm_config
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update llm config" ON public.bob_llm_config
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete llm config" ON public.bob_llm_config
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create bob_api_config table for host API endpoints
CREATE TABLE public.bob_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.bob_tenants(id) ON DELETE CASCADE,
  endpoint_type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key_secret_name TEXT,
  custom_headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on bob_api_config
ALTER TABLE public.bob_api_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for bob_api_config
CREATE POLICY "Anyone can view api config" ON public.bob_api_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert api config" ON public.bob_api_config
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update api config" ON public.bob_api_config
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete api config" ON public.bob_api_config
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Insert CARFIX tenant with Lovable AI config
INSERT INTO public.bob_tenants (name, code, domain) 
VALUES ('CARFIX', 'carfix', 'carfix.co.nz');

-- Insert default LLM config for CARFIX (using Lovable AI)
INSERT INTO public.bob_llm_config (tenant_id, provider, model, is_active)
SELECT id, 'lovable', 'google/gemini-2.5-flash', true
FROM public.bob_tenants WHERE code = 'carfix';

-- Insert API endpoints for CARFIX
INSERT INTO public.bob_api_config (tenant_id, endpoint_type, base_url, api_key_secret_name)
SELECT t.id, v.endpoint_type, v.base_url, 'CARFIX_SERVICE_ROLE_KEY'
FROM public.bob_tenants t,
(VALUES 
  ('base', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1'),
  ('retrieve_vehicle', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-vehicle-info'),
  ('retrieve_parts', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-parts'),
  ('retrieve_service_packages', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-service-packages'),
  ('search_general_products', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/search-general-products'),
  ('add_to_cart', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/add-to-cart'),
  ('get_cart', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/get-cart'),
  ('create_checkout', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/create-checkout'),
  ('get_customer_context', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/get-customer-context'),
  ('get_product_details', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/get-product-details'),
  ('search_products', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/search-products')
) AS v(endpoint_type, base_url)
WHERE t.code = 'carfix';