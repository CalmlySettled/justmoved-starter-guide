-- Fix security warnings by tightening RLS policies

-- 1. Fix user_activity_events policies
DROP POLICY IF EXISTS "System can create events" ON public.user_activity_events;

CREATE POLICY "Users can create their own events"
ON public.user_activity_events
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Fix user_sessions policies  
DROP POLICY IF EXISTS "System can insert sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "System can update sessions" ON public.user_sessions;

CREATE POLICY "Users can create their own sessions"
ON public.user_sessions
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- 3. Improve business_cache security - create a restricted view for regular users
CREATE OR REPLACE VIEW public.business_cache_public AS
SELECT 
  id,
  place_id,
  business_name,
  address,
  latitude,
  longitude,
  rating,
  opening_hours,
  features,
  photo_url,
  website,
  business_status,
  created_at,
  updated_at,
  expires_at,
  location
FROM public.business_cache
WHERE expires_at > now();

-- Grant access to the view
GRANT SELECT ON public.business_cache_public TO authenticated;

-- 4. Update business_cache policy to restrict sensitive data access
DROP POLICY IF EXISTS "Authenticated users can read business cache" ON public.business_cache;

CREATE POLICY "Admins can read full business cache"
ON public.business_cache
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) AND expires_at > now());

CREATE POLICY "System can read business cache"
ON public.business_cache
FOR SELECT
USING (auth.role() = 'service_role'::text AND expires_at > now());