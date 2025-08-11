-- Fix security issue: Restrict business_cache access to authenticated users only
-- This prevents anonymous users from accessing business contact information

-- Drop the overly permissive policy that allows anyone to read business cache
DROP POLICY IF EXISTS "Anyone can read business cache" ON public.business_cache;

-- Create new restrictive policy - require authentication
CREATE POLICY "Authenticated users can read business cache" 
ON public.business_cache 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND expires_at > now());

-- Ensure system (service role) can still manage business cache entries for edge functions
CREATE POLICY "System can manage business cache entries" 
ON public.business_cache 
FOR ALL 
USING (auth.role() = 'service_role');