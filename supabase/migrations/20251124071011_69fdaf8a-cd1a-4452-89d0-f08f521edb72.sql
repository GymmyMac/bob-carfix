-- Create bob_animations table for storing animation configurations
CREATE TABLE public.bob_animations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animation_state TEXT NOT NULL CHECK (animation_state IN ('idle', 'thinking', 'talking', 'happy', 'complete')),
  image_url TEXT NOT NULL,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bob_animations ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can view animations)
CREATE POLICY "Anyone can view animations"
ON public.bob_animations
FOR SELECT
USING (true);

-- Create policy for authenticated users to insert
CREATE POLICY "Authenticated users can insert animations"
ON public.bob_animations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for authenticated users to update
CREATE POLICY "Authenticated users can update animations"
ON public.bob_animations
FOR UPDATE
TO authenticated
USING (true);

-- Create policy for authenticated users to delete
CREATE POLICY "Authenticated users can delete animations"
ON public.bob_animations
FOR DELETE
TO authenticated
USING (true);

-- Create index for faster queries by animation_state
CREATE INDEX idx_bob_animations_state ON public.bob_animations(animation_state);

-- Create index for active animations
CREATE INDEX idx_bob_animations_active ON public.bob_animations(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_bob_animations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bob_animations_updated_at
BEFORE UPDATE ON public.bob_animations
FOR EACH ROW
EXECUTE FUNCTION public.update_bob_animations_updated_at();