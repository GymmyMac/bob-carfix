-- Create public storage bucket for Bob audio clips
INSERT INTO storage.buckets (id, name, public)
VALUES ('bob-audio', 'bob-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to bob-audio bucket
CREATE POLICY "Public read access for bob-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'bob-audio');