-- Fix security warnings by updating functions with proper search_path settings

-- Update calculate_curated_place_distance function
CREATE OR REPLACE FUNCTION public.calculate_curated_place_distance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update populate_cache_from_curation function  
CREATE OR REPLACE FUNCTION public.populate_cache_from_curation(p_property_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update update_curation_stats function
CREATE OR REPLACE FUNCTION public.update_curation_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;