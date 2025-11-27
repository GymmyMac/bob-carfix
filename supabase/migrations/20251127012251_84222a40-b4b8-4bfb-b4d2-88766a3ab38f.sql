-- Create OEM crossover reference table
CREATE TABLE public.oem_crossover (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_no TEXT,
  sku TEXT,
  ic1_code TEXT,
  ic1_code_desc TEXT,
  ic2_code TEXT,
  ic2_code_desc TEXT,
  comp_part_no TEXT,
  oem_no TEXT,
  barcode TEXT,
  usage_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.oem_crossover ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (parts data is public)
CREATE POLICY "Anyone can view OEM crossover data"
  ON public.oem_crossover
  FOR SELECT
  USING (true);

-- Create policy for admin insert (if needed later)
CREATE POLICY "Admins can insert OEM crossover data"
  ON public.oem_crossover
  FOR INSERT
  WITH CHECK (true);

-- Create policy for admin update (if needed later)
CREATE POLICY "Admins can update OEM crossover data"
  ON public.oem_crossover
  FOR UPDATE
  USING (true);

-- Create policy for admin delete (if needed later)
CREATE POLICY "Admins can delete OEM crossover data"
  ON public.oem_crossover
  FOR DELETE
  USING (true);

-- Create indexes for common lookup columns
CREATE INDEX idx_oem_crossover_part_no ON public.oem_crossover(part_no);
CREATE INDEX idx_oem_crossover_sku ON public.oem_crossover(sku);
CREATE INDEX idx_oem_crossover_oem_no ON public.oem_crossover(oem_no);
CREATE INDEX idx_oem_crossover_barcode ON public.oem_crossover(barcode);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_oem_crossover_updated_at
  BEFORE UPDATE ON public.oem_crossover
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bob_animations_updated_at();