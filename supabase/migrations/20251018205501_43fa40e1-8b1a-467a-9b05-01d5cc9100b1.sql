-- Add RLS policy to allow authenticated users (tenants) to view properties
CREATE POLICY "Authenticated users can view properties"
ON public.properties
FOR SELECT
TO authenticated
USING (true);