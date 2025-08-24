-- Create curated property places table
CREATE TABLE public.curated_property_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subfilter_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  business_name TEXT NOT NULL,
  business_address TEXT,
  business_phone TEXT,
  business_website TEXT,
  business_description TEXT,
  business_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  latitude REAL,
  longitude REAL,
  distance_miles REAL,
  place_id TEXT,
  photo_url TEXT,
  rating REAL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create curation templates table for reusable business entries
CREATE TABLE public.curation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subfilter_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  business_name TEXT NOT NULL,
  business_address TEXT,
  business_phone TEXT,
  business_website TEXT,
  business_description TEXT,
  business_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add curation status to properties table
ALTER TABLE public.properties 
ADD COLUMN curation_status TEXT DEFAULT 'not_started',
ADD COLUMN curation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_curated_places INTEGER DEFAULT 0;

-- Enable Row Level Security
ALTER TABLE public.curated_property_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curation_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for curated_property_places
CREATE POLICY "Property managers can manage curated places for their properties"
ON public.curated_property_places
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.user_roles ur ON p.manager_id = ur.user_id
    WHERE p.id = curated_property_places.property_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'property_manager'::app_role
  )
);

CREATE POLICY "Admins can view all curated places"
ON public.curated_property_places
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can access active curated places"
ON public.curated_property_places
FOR SELECT
USING (is_active = true);

-- RLS policies for curation_templates
CREATE POLICY "Property managers can manage templates"
ON public.curation_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'property_manager'::app_role
  )
);

CREATE POLICY "Admins can manage all templates"
ON public.curation_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to calculate distance for curated places
CREATE OR REPLACE FUNCTION public.calculate_curated_place_distance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate distance if we have coordinates for both property and place
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    SELECT 
      (
        3959 * acos(
          cos(radians(p.latitude)) * cos(radians(NEW.latitude)) * 
          cos(radians(NEW.longitude) - radians(p.longitude)) + 
          sin(radians(p.latitude)) * sin(radians(NEW.latitude))
        )
      ) INTO NEW.distance_miles
    FROM public.properties p
    WHERE p.id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate distance
CREATE TRIGGER calculate_distance_trigger
BEFORE INSERT OR UPDATE ON public.curated_property_places
FOR EACH ROW
EXECUTE FUNCTION public.calculate_curated_place_distance();

-- Function to populate cache from curated places
CREATE OR REPLACE FUNCTION public.populate_cache_from_curation(p_property_id UUID)
RETURNS VOID AS $$
DECLARE
  property_rec RECORD;
  category_rec RECORD;
  cache_data JSONB;
  cache_key TEXT;
BEGIN
  -- Get property details
  SELECT * INTO property_rec
  FROM public.properties
  WHERE id = p_property_id;
  
  IF property_rec.id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  
  -- Process each category with curated places
  FOR category_rec IN 
    SELECT category, 
           json_agg(
             json_build_object(
               'name', business_name,
               'address', business_address,
               'phone', business_phone,
               'website', business_website,
               'description', business_description,
               'features', business_features,
               'latitude', latitude,
               'longitude', longitude,
               'distance_miles', distance_miles,
               'place_id', place_id,
               'photo_url', photo_url,
               'rating', rating,
               'subfilter_tags', subfilter_tags
             ) ORDER BY sort_order, business_name
           ) as places
    FROM public.curated_property_places
    WHERE property_id = p_property_id
    AND is_active = true
    GROUP BY category
  LOOP
    -- Create cache key
    cache_key := 'curated_' || property_rec.latitude::text || '_' || property_rec.longitude::text || '_' || category_rec.category;
    
    -- Create cache data structure
    cache_data := json_build_object(category_rec.category, category_rec.places)::jsonb;
    
    -- Insert into recommendations cache
    INSERT INTO public.recommendations_cache (
      cache_key,
      user_coordinates,
      categories,
      recommendations,
      preferences,
      expires_at
    ) VALUES (
      cache_key,
      point(property_rec.longitude, property_rec.latitude),
      ARRAY[category_rec.category],
      cache_data,
      '{"source": "manual_curation"}'::jsonb,
      now() + interval '365 days'  -- Long expiration for manual curation
    )
    ON CONFLICT (cache_key) DO UPDATE SET
      recommendations = EXCLUDED.recommendations,
      preferences = EXCLUDED.preferences,
      expires_at = EXCLUDED.expires_at;
  END LOOP;
  
  -- Update property curation status
  UPDATE public.properties
  SET 
    curation_status = 'completed',
    curation_completed_at = now(),
    total_curated_places = (
      SELECT COUNT(*) 
      FROM public.curated_property_places 
      WHERE property_id = p_property_id AND is_active = true
    )
  WHERE id = p_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update property curation stats
CREATE OR REPLACE FUNCTION public.update_curation_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update property stats when curated places change
  UPDATE public.properties
  SET 
    total_curated_places = (
      SELECT COUNT(*) 
      FROM public.curated_property_places 
      WHERE property_id = COALESCE(NEW.property_id, OLD.property_id) 
      AND is_active = true
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.property_id, OLD.property_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for curation stats updates
CREATE TRIGGER update_curation_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.curated_property_places
FOR EACH ROW
EXECUTE FUNCTION public.update_curation_stats();