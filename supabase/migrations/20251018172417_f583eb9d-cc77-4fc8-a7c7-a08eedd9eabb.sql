-- Drop the dangerous public access policy on tenant_links table
-- This policy was exposing sensitive tenant PII to anyone on the internet
DROP POLICY IF EXISTS "Public can access active tenant links" ON public.tenant_links;

-- The remaining policies provide appropriate access:
-- 1. Admins can view all tenant links
-- 2. Property managers can manage tenant links for their properties
-- These are sufficient for legitimate use cases.
-- Tenant access should be handled via backend edge functions using the tenant_token,
-- not through direct database SELECT queries.