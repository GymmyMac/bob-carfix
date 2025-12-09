ALTER TABLE bob_animations 
ALTER COLUMN vertical_offset TYPE NUMERIC(5,2) 
USING vertical_offset::NUMERIC(5,2);