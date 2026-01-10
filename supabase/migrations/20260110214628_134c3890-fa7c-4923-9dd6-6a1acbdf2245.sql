-- ============================================
-- PHASE 10: COMPLETE RLS POLICY CLEANUP
-- Remove ALL overly permissive policies (no trailing spaces)
-- Keep SELECT (true) for public read access - this is intentional
-- ============================================

-- ============================================
-- 1. bob_animations - Drop policies without trailing spaces
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert animations" ON public.bob_animations;
DROP POLICY IF EXISTS "Anyone can update animations" ON public.bob_animations;
DROP POLICY IF EXISTS "Anyone can delete animations" ON public.bob_animations;

-- ============================================
-- 2. bob_looks - Drop policies without trailing spaces  
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert looks" ON public.bob_looks;
DROP POLICY IF EXISTS "Anyone can update looks" ON public.bob_looks;
DROP POLICY IF EXISTS "Anyone can delete looks" ON public.bob_looks;

-- ============================================
-- 3. bob_backdrops - Drop policies without trailing spaces
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert backdrops" ON public.bob_backdrops;
DROP POLICY IF EXISTS "Anyone can update backdrops" ON public.bob_backdrops;
DROP POLICY IF EXISTS "Anyone can delete backdrops" ON public.bob_backdrops;

-- ============================================
-- 4. animation_states - Drop policies without trailing spaces
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert states" ON public.animation_states;
DROP POLICY IF EXISTS "Anyone can update states" ON public.animation_states;
DROP POLICY IF EXISTS "Anyone can delete states" ON public.animation_states;

-- ============================================
-- 5. bob_settings - Drop policies without trailing spaces
-- ============================================
DROP POLICY IF EXISTS "Anyone can update settings" ON public.bob_settings;
DROP POLICY IF EXISTS "Anyone can insert settings" ON public.bob_settings;

-- ============================================
-- 6. oem_crossover - Drop old policies without trailing spaces
-- ============================================
DROP POLICY IF EXISTS "Admins can insert OEM crossover data" ON public.oem_crossover;
DROP POLICY IF EXISTS "Admins can update OEM crossover data" ON public.oem_crossover;
DROP POLICY IF EXISTS "Admins can delete OEM crossover data" ON public.oem_crossover;

-- ============================================
-- 7. bob_analytics_events - Fix insert policy (needs anonymous inserts for widget)
-- Keep INSERT (true) for analytics - widget needs to record events without auth
-- ============================================

-- ============================================
-- Recreate all admin-only write policies (if not exists)
-- ============================================

-- bob_animations
DROP POLICY IF EXISTS "Admins can insert animations" ON public.bob_animations;
DROP POLICY IF EXISTS "Admins can update animations" ON public.bob_animations;
DROP POLICY IF EXISTS "Admins can delete animations" ON public.bob_animations;

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

-- bob_looks
DROP POLICY IF EXISTS "Admins can insert looks" ON public.bob_looks;
DROP POLICY IF EXISTS "Admins can update looks" ON public.bob_looks;
DROP POLICY IF EXISTS "Admins can delete looks" ON public.bob_looks;

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

-- bob_backdrops
DROP POLICY IF EXISTS "Admins can insert backdrops" ON public.bob_backdrops;
DROP POLICY IF EXISTS "Admins can update backdrops" ON public.bob_backdrops;
DROP POLICY IF EXISTS "Admins can delete backdrops" ON public.bob_backdrops;

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

-- animation_states
DROP POLICY IF EXISTS "Admins can insert states" ON public.animation_states;
DROP POLICY IF EXISTS "Admins can update states" ON public.animation_states;
DROP POLICY IF EXISTS "Admins can delete states" ON public.animation_states;

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

-- bob_settings
DROP POLICY IF EXISTS "Admins can insert settings" ON public.bob_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.bob_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.bob_settings;

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

-- oem_crossover
DROP POLICY IF EXISTS "Admins can insert oem crossover" ON public.oem_crossover;
DROP POLICY IF EXISTS "Admins can update oem crossover" ON public.oem_crossover;
DROP POLICY IF EXISTS "Admins can delete oem crossover" ON public.oem_crossover;

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