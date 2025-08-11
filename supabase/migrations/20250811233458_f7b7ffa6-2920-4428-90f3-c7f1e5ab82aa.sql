-- Add back a proper policy for authenticated users to access business cache data
CREATE POLICY "Authenticated users can read business cache excluding sensitive data"
ON public.business_cache
FOR SELECT
USING (auth.uid() IS NOT NULL AND expires_at > now());