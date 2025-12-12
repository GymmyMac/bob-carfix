-- Enable realtime for animation_states table
ALTER PUBLICATION supabase_realtime ADD TABLE public.animation_states;

-- Enable realtime for bob_animations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bob_animations;