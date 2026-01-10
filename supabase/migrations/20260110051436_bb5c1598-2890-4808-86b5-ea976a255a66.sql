-- =============================================================================
-- Bob v3.0 Phase 3 & 9: Theme Settings and Spark Deals Configuration
-- =============================================================================

-- Create bob_theme_settings table for configurable brand colours
CREATE TABLE public.bob_theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  color_value text NOT NULL,
  hex_preview text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bob_theme_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read theme settings (needed for widget to function)
CREATE POLICY "Anyone can read theme settings" 
  ON public.bob_theme_settings 
  FOR SELECT 
  USING (true);

-- Admins can modify theme settings
CREATE POLICY "Admins can modify theme settings" 
  ON public.bob_theme_settings 
  FOR ALL 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Insert CARFIX brand defaults
INSERT INTO public.bob_theme_settings (setting_key, color_value, hex_preview, description) VALUES
  ('matrix_primary', '216 100% 40%', '#0066CC', 'Matrix rain primary colour - Dark Blue'),
  ('matrix_secondary', '199 95% 74%', '#7DD3FC', 'Matrix rain secondary colour - Light Blue'),
  ('matrix_success', '33 100% 50%', '#FF9500', 'Matrix success flash colour - Gold'),
  ('matrix_background', '223 46% 13%', '#111827', 'Matrix background colour - Navy'),
  ('matrix_background_mode', 'dark', NULL, 'Background mode: dark or light'),
  ('matrix_spark_deal_color', '33 100% 50%', '#FF9500', 'Spark Deal highlight colour - Gold');

-- Add trigger for updated_at
CREATE TRIGGER update_bob_theme_settings_updated_at
  BEFORE UPDATE ON public.bob_theme_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bob_animations_updated_at();

-- =============================================================================
-- Spark Deals Settings in bob_settings
-- =============================================================================

-- Insert Spark Deals settings
INSERT INTO public.bob_settings (setting_key, setting_value, description) VALUES
  ('spark_deals_enabled', 'true', 'Enable Spark Deals display during product loading'),
  ('spark_deals_in_rain', 'true', 'Show deal words embedded in matrix rain'),
  ('spark_deals_rain_frequency', '0.15', 'Probability of deal word appearing vs standard word'),
  ('spark_deals_priming_enabled', 'true', 'Coordinate rain with banner timing for priming effect'),
  ('spark_deals_banner_enabled', 'true', 'Show scrolling banner at bottom'),
  ('spark_deals_delay_ms', '2000', 'Delay in ms before showing first deal'),
  ('spark_deals_scroll_speed', '5000', 'Time in ms for deal to scroll across screen'),
  ('spark_deals_max_per_session', '3', 'Maximum deals to show per search session'),
  ('spark_deals_min_research_time', '1500', 'Minimum research time in ms to show deals'),
  ('spark_deals_bob_commentary', 'false', 'Enable Bob to comment on Spark Deals')
ON CONFLICT (setting_key) DO NOTHING;