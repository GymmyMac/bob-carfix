-- Create bob_partners table for centralized partner configuration
CREATE TABLE public.bob_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  
  -- API Configuration
  api_base_url TEXT NOT NULL,
  api_key_secret_name TEXT,
  
  -- Bob's Supabase credentials
  bob_supabase_url TEXT DEFAULT 'https://gjoguxzstsihhxvdgpto.supabase.co',
  bob_supabase_key TEXT DEFAULT 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb2d1eHpzdHNpaGh4dmRncHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzgyODEsImV4cCI6MjA3OTUxNDI4MX0.detu4TKB7RjC6l6CrVaPYoi0Hhz2asDt6zxNx1cdzq8',
  
  -- Layout preferences
  default_bottom_offset INTEGER DEFAULT 0,
  default_z_index_base INTEGER DEFAULT 50,
  backdrop_blur_intensity NUMERIC(4,1) DEFAULT 8.0,
  backdrop_overlay_opacity NUMERIC(3,2) DEFAULT 0.15,
  
  -- Allowed domains for security
  allowed_origins TEXT[] DEFAULT '{}',
  
  -- Feature flags
  feature_flags JSONB DEFAULT '{"showServicePackages": true, "enableTTS": true, "enableSpeechRecognition": true}'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bob_partners ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active partners" 
ON public.bob_partners 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage partners" 
ON public.bob_partners 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed CARFIX partner configuration
INSERT INTO public.bob_partners (
  partner_code, 
  display_name, 
  api_base_url, 
  api_key_secret_name, 
  allowed_origins,
  default_bottom_offset,
  backdrop_blur_intensity,
  backdrop_overlay_opacity,
  feature_flags
) VALUES (
  'CARFIX',
  'CARFIX Auto Parts',
  'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1',
  'CARFIX_SERVICE_ROLE_KEY',
  ARRAY['https://carfix.co.nz', 'https://www.carfix.co.nz', 'https://carfix-beta.lovable.app', 'http://localhost:3000', 'http://localhost:5173'],
  60,
  4.0,
  0.10,
  '{"showServicePackages": true, "enableTTS": true, "enableSpeechRecognition": true, "showDebugOverlay": false}'::jsonb
);

-- Create updated_at trigger
CREATE TRIGGER update_bob_partners_updated_at
BEFORE UPDATE ON public.bob_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_bob_animations_updated_at();