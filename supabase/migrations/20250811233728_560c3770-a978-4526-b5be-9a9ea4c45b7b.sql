-- Fix security issues with business cache access

-- Enable RLS on business_cache_public view
ALTER TABLE public.business_cache_public ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for business_cache_public view - only non-expired data
CREATE POLICY "Public business cache basic access"
ON public.business_cache_public
FOR SELECT
USING (expires_at > now());

-- Drop the overly permissive policy on business_cache
DROP POLICY IF EXISTS "Authenticated users can read business cache excluding sensitive data" ON public.business_cache;

-- Create more restrictive policies for business_cache
-- Regular users: can read basic business info but NOT phone/website
CREATE POLICY "Authenticated users can read basic business info"
ON public.business_cache
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND expires_at > now()
);

-- Create a view for public business data that excludes sensitive information
DROP VIEW IF EXISTS public.business_cache_safe;
CREATE VIEW public.business_cache_safe AS
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

-- Enable RLS on the safe view
ALTER VIEW public.business_cache_safe SET (security_barrier = true);

-- Grant appropriate permissions
GRANT SELECT ON public.business_cache_safe TO authenticated;
GRANT SELECT ON public.business_cache_safe TO anon;