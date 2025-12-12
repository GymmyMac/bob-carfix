-- Drop the existing unique constraint on state_key alone
ALTER TABLE animation_states DROP CONSTRAINT IF EXISTS animation_states_state_key_key;

-- Add a new composite unique constraint for state_key + look_id
ALTER TABLE animation_states ADD CONSTRAINT animation_states_state_key_look_id_key UNIQUE (state_key, look_id);