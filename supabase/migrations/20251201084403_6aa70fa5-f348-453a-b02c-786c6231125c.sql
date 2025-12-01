-- Drop overly permissive public read policies
DROP POLICY IF EXISTS "Allow anon read properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;

-- Allow property managers to view their own properties
CREATE POLICY "Property managers can view their own properties" 
ON public.properties 
FOR SELECT 
TO authenticated
USING (manager_id = auth.uid());

-- Allow tenants to view their associated property
CREATE POLICY "Tenants can view their property" 
ON public.properties 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.property_id = properties.id
  )
);