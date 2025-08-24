-- Add policy allowing admins to manage curated places (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all curated places" ON public.curated_property_places
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));