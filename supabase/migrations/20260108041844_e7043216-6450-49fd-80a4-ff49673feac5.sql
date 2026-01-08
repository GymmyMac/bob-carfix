-- Clear duplicate triggers - keep only ONE state per trigger
-- This prevents Bob from jumping between multiple states for the same chat stage

-- Remove triggers from states that shouldn't auto-activate
UPDATE animation_states SET chat_trigger = NULL WHERE state_key = 'hello';
UPDATE animation_states SET chat_trigger = NULL WHERE state_key = 'idle';
UPDATE animation_states SET chat_trigger = NULL WHERE state_key = 'talk_pause';
UPDATE animation_states SET chat_trigger = NULL WHERE state_key = 'talk';
UPDATE animation_states SET chat_trigger = NULL WHERE state_key = 'researching';

-- Verify listening has correct settings for smooth waiting animation
UPDATE animation_states 
SET animation_speed = 1500, loop_count = 0, pause_duration = 0 
WHERE state_key = 'listening';