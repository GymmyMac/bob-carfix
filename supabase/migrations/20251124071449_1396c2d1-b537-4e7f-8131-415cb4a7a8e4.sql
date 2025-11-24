-- Create RLS policies for bob-images storage bucket

-- Policy to allow anyone to read images from bob-images bucket (public access)
CREATE POLICY "Public Access to bob-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bob-images');

-- Policy to allow anyone to upload images to bob-images bucket
CREATE POLICY "Anyone can upload to bob-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bob-images');

-- Policy to allow anyone to update images in bob-images bucket
CREATE POLICY "Anyone can update bob-images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'bob-images');

-- Policy to allow anyone to delete images from bob-images bucket
CREATE POLICY "Anyone can delete from bob-images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'bob-images');