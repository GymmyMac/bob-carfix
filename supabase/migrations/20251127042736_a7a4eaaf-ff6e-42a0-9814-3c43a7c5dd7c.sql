-- Create bob_backdrops table for promotional backdrop images
CREATE TABLE public.bob_backdrops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bob_backdrops ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching existing pattern)
CREATE POLICY "Anyone can view backdrops" 
ON public.bob_backdrops 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert backdrops" 
ON public.bob_backdrops 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update backdrops" 
ON public.bob_backdrops 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete backdrops" 
ON public.bob_backdrops 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bob_backdrops_updated_at
BEFORE UPDATE ON public.bob_backdrops
FOR EACH ROW
EXECUTE FUNCTION public.update_bob_animations_updated_at();