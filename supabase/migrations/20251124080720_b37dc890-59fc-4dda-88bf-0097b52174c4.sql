-- Remove the hardcoded state restriction to allow dynamic state management
ALTER TABLE bob_animations 
DROP CONSTRAINT IF EXISTS bob_animations_animation_state_check;