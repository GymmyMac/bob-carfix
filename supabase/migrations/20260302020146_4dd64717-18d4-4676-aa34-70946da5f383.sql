
-- Create bob_conversations table for real-time admin dashboard funnel
CREATE TABLE public.bob_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 1,
  channel text NOT NULL DEFAULT 'web',
  had_product_match boolean NOT NULL DEFAULT false,
  led_to_cart boolean NOT NULL DEFAULT false,
  vehicle_id text NULL,
  rego text NULL,
  UNIQUE (session_id)
);

-- Enable RLS
ALTER TABLE public.bob_conversations ENABLE ROW LEVEL SECURITY;

-- Admins can read all conversations
CREATE POLICY "Admins can view bob_conversations"
  ON public.bob_conversations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role / anon can insert (edge function uses service role)
CREATE POLICY "Service can insert bob_conversations"
  ON public.bob_conversations FOR INSERT
  WITH CHECK (true);

-- Service role / anon can update (for upsert)
CREATE POLICY "Service can update bob_conversations"
  ON public.bob_conversations FOR UPDATE
  USING (true);

-- Index for the dashboard query
CREATE INDEX idx_bob_conversations_last_message ON public.bob_conversations (last_message_at);
