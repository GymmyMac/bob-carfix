-- Fix Storage Bucket Policies
-- Drop duplicate authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can upload Bob images" ON storage.objects;

-- Fix animation_states Table Policies
-- Drop existing authenticated policies
DROP POLICY IF EXISTS "Authenticated users can insert states" ON animation_states;
DROP POLICY IF EXISTS "Authenticated users can update states" ON animation_states;
DROP POLICY IF EXISTS "Authenticated users can delete states" ON animation_states;

-- Create new public policies for animation_states
CREATE POLICY "Anyone can insert states" ON animation_states
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update states" ON animation_states
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete states" ON animation_states
  FOR DELETE USING (true);

-- Fix bob_animations Table Policies
-- Drop existing authenticated policies
DROP POLICY IF EXISTS "Authenticated users can insert animations" ON bob_animations;
DROP POLICY IF EXISTS "Authenticated users can update animations" ON bob_animations;
DROP POLICY IF EXISTS "Authenticated users can delete animations" ON bob_animations;

-- Create new public policies for bob_animations
CREATE POLICY "Anyone can insert animations" ON bob_animations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update animations" ON bob_animations
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete animations" ON bob_animations
  FOR DELETE USING (true);