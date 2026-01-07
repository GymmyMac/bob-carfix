-- Create bob_prompts table for admin-editable prompt sections
CREATE TABLE public.bob_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_key VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bob_prompts ENABLE ROW LEVEL SECURITY;

-- Allow public read (prompts are loaded by edge function)
CREATE POLICY "Prompts are readable by everyone" 
ON public.bob_prompts 
FOR SELECT 
USING (true);

-- Only admins can modify prompts
CREATE POLICY "Admins can insert prompts" 
ON public.bob_prompts 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prompts" 
ON public.bob_prompts 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prompts" 
ON public.bob_prompts 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_bob_prompts_updated_at
BEFORE UPDATE ON public.bob_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_bob_animations_updated_at();

-- Add indexes for quick lookup
CREATE INDEX idx_bob_prompts_key ON public.bob_prompts(prompt_key);
CREATE INDEX idx_bob_prompts_category ON public.bob_prompts(category);