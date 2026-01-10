-- ============================================
-- PHASE 10: RLS SECURITY AUDIT
-- Fix all overly permissive policies
-- Pattern: Public read, Admin-only write
-- ============================================

-- ============================================
-- 1. bob_animations - Drop and recreate policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert animations " ON public.bob_animations;
DROP POLICY IF EXISTS "Anyone can update animations " ON public.bob_animations;
DROP POLICY IF EXISTS "Anyone can delete animations " ON public.bob_animations;

CREATE POLICY "Admins can insert animations"
  ON public.bob_animations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update animations"
  ON public.bob_animations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete animations"
  ON public.bob_animations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. bob_looks - Drop and recreate policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert looks " ON public.bob_looks;
DROP POLICY IF EXISTS "Anyone can update looks " ON public.bob_looks;
DROP POLICY IF EXISTS "Anyone can delete looks " ON public.bob_looks;

CREATE POLICY "Admins can insert looks"
  ON public.bob_looks FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update looks"
  ON public.bob_looks FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete looks"
  ON public.bob_looks FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. bob_backdrops - Drop and recreate policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert backdrops " ON public.bob_backdrops;
DROP POLICY IF EXISTS "Anyone can update backdrops " ON public.bob_backdrops;
DROP POLICY IF EXISTS "Anyone can delete backdrops " ON public.bob_backdrops;

CREATE POLICY "Admins can insert backdrops"
  ON public.bob_backdrops FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update backdrops"
  ON public.bob_backdrops FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete backdrops"
  ON public.bob_backdrops FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. animation_states - Drop and recreate policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert states " ON public.animation_states;
DROP POLICY IF EXISTS "Anyone can update states " ON public.animation_states;
DROP POLICY IF EXISTS "Anyone can delete states " ON public.animation_states;

CREATE POLICY "Admins can insert states"
  ON public.animation_states FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update states"
  ON public.animation_states FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete states"
  ON public.animation_states FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 5. bob_settings - Drop and recreate policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can update settings " ON public.bob_settings;
DROP POLICY IF EXISTS "Anyone can insert settings " ON public.bob_settings;

CREATE POLICY "Admins can insert settings"
  ON public.bob_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
  ON public.bob_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
  ON public.bob_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 6. oem_crossover - Drop and recreate policies
-- ============================================
DROP POLICY IF EXISTS "Admins can insert OEM crossover data " ON public.oem_crossover;
DROP POLICY IF EXISTS "Admins can update OEM crossover data " ON public.oem_crossover;
DROP POLICY IF EXISTS "Admins can delete OEM crossover data " ON public.oem_crossover;

CREATE POLICY "Admins can insert oem crossover"
  ON public.oem_crossover FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update oem crossover"
  ON public.oem_crossover FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete oem crossover"
  ON public.oem_crossover FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));