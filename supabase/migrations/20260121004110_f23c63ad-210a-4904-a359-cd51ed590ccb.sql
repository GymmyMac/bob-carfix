-- Create table for pre-recorded audio clips
CREATE TABLE public.bob_audio_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_key TEXT UNIQUE NOT NULL,
  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration_ms INTEGER,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.bob_tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bob_audio_clips ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view audio clips"
ON public.bob_audio_clips FOR SELECT
USING (true);

CREATE POLICY "Admins can insert audio clips"
ON public.bob_audio_clips FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update audio clips"
ON public.bob_audio_clips FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete audio clips"
ON public.bob_audio_clips FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for fast lookups
CREATE INDEX idx_bob_audio_clips_key ON public.bob_audio_clips(clip_key) WHERE is_active = true;