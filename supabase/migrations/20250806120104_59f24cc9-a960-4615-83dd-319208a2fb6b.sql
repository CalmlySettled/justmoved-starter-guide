-- Clear problematic pharmacy cache entries that contain empty arrays
DELETE FROM public.recommendations_cache 
WHERE (cache_key LIKE '%pharmacy%' OR cache_key LIKE '%pharmacies%')
   OR (recommendations IS NOT NULL AND jsonb_array_length(recommendations::jsonb) = 0);

-- Update the cleanup function to also remove empty result caches
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Delete expired cache entries
  DELETE FROM public.recommendations_cache 
  WHERE expires_at < now();
  
  -- Clean up empty result caches (they should not persist)
  DELETE FROM public.recommendations_cache
  WHERE recommendations IS NOT NULL 
    AND jsonb_typeof(recommendations) = 'array' 
    AND jsonb_array_length(recommendations) = 0;
  
  -- Also clean up legacy cache entries without proper prefixes  
  DELETE FROM public.recommendations_cache
  WHERE cache_key NOT LIKE 'popular_%' 
    AND cache_key NOT LIKE 'explore_%'
    AND created_at < now() - interval '1 day';
END;
$function$;