-- Fix conflicting RLS policies on recommendations_cache table
-- Remove the less restrictive policy to eliminate conflicting access rules

DROP POLICY IF EXISTS "Authenticated users can read unexpired cache entries" ON public.recommendations_cache;

-- Keep only the more secure policy:
-- "Authenticated users can access location cache" which checks both expiration and authentication