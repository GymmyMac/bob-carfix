-- Create bob_settings table for global Bob configurations
CREATE TABLE public.bob_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default voice setting
INSERT INTO public.bob_settings (setting_key, setting_value, description)
VALUES ('tts_voice', 'en-AU-Neural2-B', 'Google Cloud TTS voice for Bob');

-- Enable RLS
ALTER TABLE public.bob_settings ENABLE ROW LEVEL SECURITY;

-- Public access policies (admin panel is public)
CREATE POLICY "Anyone can read settings" ON public.bob_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update settings" ON public.bob_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert settings" ON public.bob_settings FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_bob_settings_updated_at
BEFORE UPDATE ON public.bob_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_bob_animations_updated_at();