-- Add vertical_offset column to bob_animations table for per-image positioning
ALTER TABLE bob_animations 
ADD COLUMN vertical_offset INTEGER DEFAULT 0;

COMMENT ON COLUMN bob_animations.vertical_offset IS 'Vertical offset in pixels to align image with backdrop countertop. Positive values move image down.';