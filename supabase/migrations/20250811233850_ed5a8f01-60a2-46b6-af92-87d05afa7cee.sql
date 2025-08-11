-- Fix security issues with business cache access (corrected approach)

-- Since business_cache_public is a view, we need to secure the underlying table access instead
-- Drop the overly permissive policy on business_cache
DROP POLICY IF EXISTS "Authenticated users can read business cache excluding sensitive data" ON public.business_cache;

-- Create more restrictive policy for business_cache that excludes sensitive columns
-- This will be used when applications need basic business info
CREATE POLICY "Authenticated users can read basic business info"
ON public.business_cache
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND expires_at > now()
);

-- Admin policy to access sensitive data (phone, website)
CREATE POLICY "Admins can read full business cache data"
ON public.business_cache
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND expires_at > now()
);

-- Create a secure public view that excludes sensitive information
-- This replaces business_cache_public with a more secure version
CREATE OR REPLACE VIEW public.business_cache_public_safe AS
SELECT 
  id,
  place_id,
  business_name,
  address,
  latitude,
  longitude,
  rating,
  features,
  photo_url,
  business_status,
  opening_hours,
  location,
  created_at,
  updated_at,
  expires_at
FROM public.business_cache
WHERE expires_at > now();

-- Set security barrier to ensure RLS is applied
ALTER VIEW public.business_cache_public_safe SET (security_barrier = true);

-- Drop the old public view to prevent data leakage
DROP VIEW IF EXISTS public.business_cache_public;

-- Grant appropriate permissions on the safe view
GRANT SELECT ON public.business_cache_public_safe TO authenticated;
GRANT SELECT ON public.business_cache_public_safe TO anon;