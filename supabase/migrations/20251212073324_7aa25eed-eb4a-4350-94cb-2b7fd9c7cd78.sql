-- Add scale column to bob_animations for per-frame character size normalization
ALTER TABLE bob_animations 
ADD COLUMN scale NUMERIC(5,2) DEFAULT 100;

-- Add comment explaining the column
COMMENT ON COLUMN bob_animations.scale IS 'Scale percentage (50-200) to normalize character visual size across animation frames';