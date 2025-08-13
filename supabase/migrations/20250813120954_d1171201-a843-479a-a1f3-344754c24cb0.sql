-- Create policies for properties table
CREATE POLICY "Property managers can manage their properties" 
ON public.properties 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'property_manager'
  ) AND manager_id = auth.uid()
);

CREATE POLICY "Admins can view all properties" 
ON public.properties 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create policies for tenant_links table
CREATE POLICY "Property managers can manage tenant links for their properties" 
ON public.tenant_links 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.user_roles ur ON p.manager_id = ur.user_id
    WHERE p.id = tenant_links.property_id 
    AND ur.user_id = auth.uid() 
    AND ur.role = 'property_manager'
  )
);

CREATE POLICY "Public can access active tenant links" 
ON public.tenant_links 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all tenant links" 
ON public.tenant_links 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create policies for property_analytics table
CREATE POLICY "Property managers can view analytics for their properties" 
ON public.property_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.user_roles ur ON p.manager_id = ur.user_id
    WHERE p.id = property_analytics.property_id 
    AND ur.user_id = auth.uid() 
    AND ur.role = 'property_manager'
  )
);

CREATE POLICY "System can insert analytics" 
ON public.property_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all analytics" 
ON public.property_analytics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_links_updated_at
BEFORE UPDATE ON public.tenant_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();