-- Add canned response columns to bob_audio_clips table
ALTER TABLE bob_audio_clips 
ADD COLUMN IF NOT EXISTS response_trigger TEXT,
ADD COLUMN IF NOT EXISTS bypass_ai BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trigger_context TEXT;

COMMENT ON COLUMN bob_audio_clips.response_trigger IS 'Context that triggers this response (e.g., "need_rego", "vehicle_lookup_start")';
COMMENT ON COLUMN bob_audio_clips.bypass_ai IS 'If true, return transcript as chat response without calling AI';
COMMENT ON COLUMN bob_audio_clips.trigger_context IS 'When to trigger: "no_vehicle", "lookup_started", "parts_loaded"';

-- Seed the ask_rego clip with bypass settings
UPDATE bob_audio_clips 
SET response_trigger = 'need_rego',
    bypass_ai = true,
    trigger_context = 'no_vehicle'
WHERE clip_key = 'ask_rego';