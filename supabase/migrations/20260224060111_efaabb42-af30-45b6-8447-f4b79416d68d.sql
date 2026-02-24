
-- Create the updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create bob_brand_affinity table
CREATE TABLE public.bob_brand_affinity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand text NOT NULL,
  category text,
  affinity_level text NOT NULL DEFAULT 'preferred',
  talk_track text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bob_brand_affinity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brand affinity"
  ON public.bob_brand_affinity FOR SELECT USING (true);
CREATE POLICY "Admins can insert brand affinity"
  ON public.bob_brand_affinity FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update brand affinity"
  ON public.bob_brand_affinity FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete brand affinity"
  ON public.bob_brand_affinity FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create bob_promotions table
CREATE TABLE public.bob_promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  brand text,
  category text,
  sku_list text[],
  discount_percent numeric,
  talk_track text NOT NULL,
  priority integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamp with time zone NOT NULL DEFAULT now(),
  valid_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bob_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view promotions"
  ON public.bob_promotions FOR SELECT USING (true);
CREATE POLICY "Admins can insert promotions"
  ON public.bob_promotions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update promotions"
  ON public.bob_promotions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete promotions"
  ON public.bob_promotions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers
CREATE TRIGGER update_bob_brand_affinity_updated_at
  BEFORE UPDATE ON public.bob_brand_affinity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bob_promotions_updated_at
  BEFORE UPDATE ON public.bob_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
