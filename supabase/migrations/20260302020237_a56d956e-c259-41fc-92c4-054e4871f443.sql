
CREATE OR REPLACE FUNCTION public.upsert_bob_conversation(
  p_session_id text,
  p_user_id uuid DEFAULT NULL,
  p_channel text DEFAULT 'web',
  p_vehicle_id text DEFAULT NULL,
  p_rego text DEFAULT NULL,
  p_had_product_match boolean DEFAULT false,
  p_led_to_cart boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO bob_conversations (session_id, user_id, channel, vehicle_id, rego, had_product_match, led_to_cart)
  VALUES (p_session_id, p_user_id, p_channel, p_vehicle_id, p_rego, p_had_product_match, p_led_to_cart)
  ON CONFLICT (session_id) DO UPDATE SET
    last_message_at = now(),
    message_count = bob_conversations.message_count + 1,
    vehicle_id = COALESCE(EXCLUDED.vehicle_id, bob_conversations.vehicle_id),
    rego = COALESCE(EXCLUDED.rego, bob_conversations.rego),
    had_product_match = bob_conversations.had_product_match OR EXCLUDED.had_product_match,
    led_to_cart = bob_conversations.led_to_cart OR EXCLUDED.led_to_cart;

  SELECT jsonb_build_object('session_id', p_session_id, 'upserted', true) INTO result;
  RETURN result;
END;
$$;
