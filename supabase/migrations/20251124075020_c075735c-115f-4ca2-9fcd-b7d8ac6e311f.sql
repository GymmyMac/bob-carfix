-- Create animation_states table for dynamic state management
CREATE TABLE IF NOT EXISTS public.animation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.animation_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view states" 
  ON public.animation_states 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert states" 
  ON public.animation_states 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update states" 
  ON public.animation_states 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Authenticated users can delete states" 
  ON public.animation_states 
  FOR DELETE 
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_animation_states_updated_at
  BEFORE UPDATE ON public.animation_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bob_animations_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_animation_states_active ON public.animation_states(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_animation_states_key ON public.animation_states(state_key);

-- Seed with existing 5 states
INSERT INTO public.animation_states (state_key, title, description, display_order) VALUES
  ('idle', 'Idle State', 'Default state - Anything else I can help with?', 1),
  ('thinking', 'Thinking State', 'Used when researching or processing information', 2),
  ('talking', 'Talking State', 'Used during conversational responses', 3),
  ('happy', 'Happy State', 'Welcome, thank you, completing sales, being happy/laughing', 4),
  ('complete', 'Complete State', 'Thank you, all done, great to see you come back soon', 5)
ON CONFLICT (state_key) DO NOTHING;