-- Create bob_looks table for managing different Bob visual themes
CREATE TABLE public.bob_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bob_looks ENABLE ROW LEVEL SECURITY;

-- RLS policies for bob_looks
CREATE POLICY "Anyone can view looks" ON public.bob_looks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert looks" ON public.bob_looks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update looks" ON public.bob_looks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete looks" ON public.bob_looks FOR DELETE USING (true);

-- Insert default look
INSERT INTO public.bob_looks (name, description, is_active, display_order)
VALUES ('Default', 'Original Bob look', true, 1);

-- Add look_id column to animation_states
ALTER TABLE public.animation_states ADD COLUMN look_id UUID REFERENCES public.bob_looks(id) ON DELETE CASCADE;

-- Add look_id column to bob_animations
ALTER TABLE public.bob_animations ADD COLUMN look_id UUID REFERENCES public.bob_looks(id) ON DELETE CASCADE;

-- Update existing records to use the default look
UPDATE public.animation_states SET look_id = (SELECT id FROM public.bob_looks WHERE name = 'Default' LIMIT 1);
UPDATE public.bob_animations SET look_id = (SELECT id FROM public.bob_looks WHERE name = 'Default' LIMIT 1);

-- Create index for faster lookups
CREATE INDEX idx_animation_states_look_id ON public.animation_states(look_id);
CREATE INDEX idx_bob_animations_look_id ON public.bob_animations(look_id);