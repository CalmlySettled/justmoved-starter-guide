-- Simplify populate_cache_from_curation to use property ID-based cache keys
-- This removes the coordinate requirement for publishing curations

CREATE OR REPLACE FUNCTION public.populate_cache_from_curation(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Create property-based cache key (no coordinates needed)
    cache_key := 'property_' || p_property_id::text || '_' || category_rec.category;
    
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
      point(0, 0), -- Placeholder coordinates (not used for property-based lookups)
      ARRAY[category_rec.category],
      cache_data,
      '{"source": "manual_curation"}'::jsonb,
      now() + interval '365 days'
    )
    ON CONFLICT ON CONSTRAINT recommendations_cache_cache_key_key DO UPDATE SET
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
$function$;