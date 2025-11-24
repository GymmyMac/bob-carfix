-- Create storage bucket for Bob images
INSERT INTO storage.buckets (id, name, public)
VALUES ('bob-images', 'bob-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read Bob images
CREATE POLICY "Public read access for Bob images"
ON storage.objects FOR SELECT
USING (bucket_id = 'bob-images');

-- Allow authenticated users to upload Bob images (for admin purposes)
CREATE POLICY "Authenticated users can upload Bob images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bob-images' AND auth.role() = 'authenticated');