-- Add animation control columns to animation_states table
ALTER TABLE animation_states 
ADD COLUMN IF NOT EXISTS animation_speed integer DEFAULT 400,
ADD COLUMN IF NOT EXISTS pause_duration integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS loop_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS chat_trigger text;

-- Add comments for clarity
COMMENT ON COLUMN animation_states.animation_speed IS 'Milliseconds between frames (default 400ms)';
COMMENT ON COLUMN animation_states.pause_duration IS 'Milliseconds to pause after completing loops (default 0 = no pause)';
COMMENT ON COLUMN animation_states.loop_count IS 'Number of times to loop sequence (0 = infinite loop, default 0)';
COMMENT ON COLUMN animation_states.chat_trigger IS 'When state triggers in chat: page_load, awaiting_input, processing_input, streaming_response, response_complete';