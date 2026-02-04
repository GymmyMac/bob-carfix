-- Create bob_error_logs table for analytics tracking
CREATE TABLE IF NOT EXISTS public.bob_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  vehicle_id INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  rego TEXT,
  additional_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_bob_error_logs_type ON public.bob_error_logs(error_type);
CREATE INDEX idx_bob_error_logs_created ON public.bob_error_logs(created_at);

-- Enable RLS (backend-only table)
ALTER TABLE public.bob_error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can insert (edge functions use service role)
CREATE POLICY "Service role can insert error logs"
ON public.bob_error_logs
FOR INSERT
WITH CHECK (true);

-- Policy: Service role can read for analytics
CREATE POLICY "Service role can read error logs"
ON public.bob_error_logs
FOR SELECT
USING (true);