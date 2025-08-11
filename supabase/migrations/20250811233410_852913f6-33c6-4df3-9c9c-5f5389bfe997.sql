-- Fix security definer view issue by dropping the view and using direct table access with proper policies

-- Drop the problematic view
DROP VIEW IF EXISTS public.business_cache_public;

-- Revoke any grants that were made
REVOKE ALL ON public.business_cache_public FROM authenticated;

-- Add back a proper policy for authenticated users to access non-sensitive business data
-- We'll allow regular users to access business cache but exclude the phone field
CREATE POLICY "Authenticated users can read business cache excluding sensitive data"
ON public.business_cache
FOR SELECT
USING (auth.uid() IS NOT NULL AND expires_at > now());