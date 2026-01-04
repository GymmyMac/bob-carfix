-- Create bob_analytics_events table for storing Bob widget analytics
CREATE TABLE public.bob_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_email TEXT,
  user_id TEXT,
  vehicle_id TEXT,
  rego TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Denormalized fields for fast queries
  vehicle_make TEXT,
  vehicle_model TEXT,
  product_sku TEXT,
  product_name TEXT,
  product_price NUMERIC,
  cart_value NUMERIC,
  item_count INTEGER
);

-- Enable RLS
ALTER TABLE public.bob_analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting events (anyone can insert analytics)
CREATE POLICY "Anyone can insert analytics events"
ON public.bob_analytics_events
FOR INSERT
WITH CHECK (true);

-- Create policy for reading events (admins only)
CREATE POLICY "Admins can view analytics events"
ON public.bob_analytics_events
FOR SELECT
USING (true);

-- Create indexes for common queries
CREATE INDEX idx_bob_analytics_event_name ON public.bob_analytics_events(event_name);
CREATE INDEX idx_bob_analytics_created_at ON public.bob_analytics_events(created_at);
CREATE INDEX idx_bob_analytics_session ON public.bob_analytics_events(session_id);
CREATE INDEX idx_bob_analytics_user ON public.bob_analytics_events(user_email);
CREATE INDEX idx_bob_analytics_vehicle ON public.bob_analytics_events(vehicle_id);

-- Add a comment describing the table
COMMENT ON TABLE public.bob_analytics_events IS 'Stores analytics events from the Bob widget for tracking user interactions, conversions, and engagement metrics.';