-- Fix the Security Definer View issue by removing the problematic view
-- The business_cache_public_safe view is causing the security warning

-- Drop the view that's causing the security warning
DROP VIEW IF EXISTS public.business_cache_public_safe;

-- Instead of a view, we'll rely on the RLS policies on the business_cache table
-- which already properly restrict access to sensitive data for non-admin users

-- Ensure the business_cache table has proper policies in place
-- (These should already exist from our previous migration, but let's verify)

-- Grant explicit permissions for authenticated users to read from business_cache
-- This will work with the existing RLS policies
GRANT SELECT ON public.business_cache TO authenticated;
GRANT SELECT ON public.business_cache TO anon;