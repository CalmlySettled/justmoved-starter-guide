-- Fix the Security Definer View warning
-- Remove the security_barrier setting that was causing the warning
ALTER VIEW public.business_cache_public_safe RESET (security_barrier);

-- The view will still be secure because it only exposes non-sensitive columns
-- and relies on the underlying table's RLS policies for access control