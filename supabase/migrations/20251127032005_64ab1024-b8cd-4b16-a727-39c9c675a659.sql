-- Add idle_timeout_ms column to animation_states table
-- This allows configuring how long Bob waits in idle state before returning to welcome/wave
ALTER TABLE animation_states 
ADD COLUMN idle_timeout_ms INTEGER DEFAULT NULL;

COMMENT ON COLUMN animation_states.idle_timeout_ms IS 'Milliseconds to wait in idle state before looping back to welcome state (NULL = disabled)';