-- Add property_manager role to existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'property_manager';

-- Create properties table for property managers
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL,
  property_name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  contact_info JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_links table for QR code generation
CREATE TABLE public.tenant_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_token TEXT NOT NULL UNIQUE,
  tenant_name TEXT NOT NULL,
  unit_number TEXT,
  move_in_date DATE,
  contact_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  cache_warmed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create property_analytics table for tracking
CREATE TABLE public.property_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_link_id UUID REFERENCES public.tenant_links(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_analytics ENABLE ROW LEVEL SECURITY;

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

-- Create function to pre-warm cache for a property
CREATE OR REPLACE FUNCTION public.prewarm_property_cache(
  p_property_id UUID,
  p_categories TEXT[] DEFAULT ARRAY['restaurants', 'grocery_stores', 'pharmacies', 'gyms', 'banks', 'gas_stations', 'coffee_shops', 'beauty_salons', 'medical', 'shopping']
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  property_record RECORD;
  cache_key TEXT;
  category TEXT;
  result JSONB := '{"success": true, "cached_categories": []}'::jsonb;
BEGIN
  -- Get property details
  SELECT * INTO property_record 
  FROM public.properties 
  WHERE id = p_property_id;
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Property not found"}'::jsonb;
  END IF;
  
  -- Check if property has valid coordinates
  IF property_record.latitude IS NULL OR property_record.longitude IS NULL THEN
    RETURN '{"success": false, "error": "Property coordinates not available"}'::jsonb;
  END IF;
  
  -- Generate cache entries for each category
  FOREACH category IN ARRAY p_categories
  LOOP
    -- Generate cache key similar to the existing system
    cache_key := 'explore_' || category || '_' || 
                 ROUND(property_record.latitude::numeric, 4)::text || '_' || 
                 ROUND(property_record.longitude::numeric, 4)::text;
    
    -- Insert placeholder cache entry (actual API calls will be made by edge functions)
    INSERT INTO public.recommendations_cache (
      cache_key,
      user_coordinates,
      categories,
      recommendations,
      coordinate_hash,
      privacy_level,
      expires_at
    ) VALUES (
      cache_key,
      point(property_record.longitude, property_record.latitude),
      ARRAY[category],
      '{"status": "pre_warmed", "property_id": "' || p_property_id || '"}'::jsonb,
      md5(property_record.latitude::text || '|' || property_record.longitude::text),
      'property_cache',
      now() + interval '120 days'
    )
    ON CONFLICT (cache_key) DO UPDATE SET
      updated_at = now(),
      expires_at = now() + interval '120 days';
    
    -- Add to result
    result := jsonb_set(
      result,
      '{cached_categories}',
      (result->'cached_categories') || to_jsonb(category)
    );
  END LOOP;
  
  RETURN result;
END;
$$;