-- Add state association and chat trigger columns to bob_audio_clips
ALTER TABLE bob_audio_clips 
ADD COLUMN IF NOT EXISTS animation_state_id UUID REFERENCES animation_states(id) ON DELETE SET NULL;

ALTER TABLE bob_audio_clips 
ADD COLUMN IF NOT EXISTS chat_trigger TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bob_audio_clips_chat_trigger ON bob_audio_clips(chat_trigger);
CREATE INDEX IF NOT EXISTS idx_bob_audio_clips_animation_state_id ON bob_audio_clips(animation_state_id);