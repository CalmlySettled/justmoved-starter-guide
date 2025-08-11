-- Fix security issue: Restrict recommendations_cache access to authenticated users only
-- This prevents anonymous harvesting of location data while maintaining cache functionality

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can read unexpired cache entries" ON public.recommendations_cache;

-- Create a new policy that requires authentication to read cache entries
CREATE POLICY "Authenticated users can read unexpired cache entries" 
ON public.recommendations_cache 
FOR SELECT 
TO authenticated
USING (expires_at > now());

-- Add a policy to allow authenticated users to read cache for location-based recommendations
-- This maintains the shared cache functionality while requiring authentication
CREATE POLICY "Authenticated users can access location cache" 
ON public.recommendations_cache 
FOR SELECT 
TO authenticated
USING (
  expires_at > now() 
  AND auth.role() = 'authenticated'
);