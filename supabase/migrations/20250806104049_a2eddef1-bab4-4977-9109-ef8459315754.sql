-- Clean up legacy cache entries that contain complex preference data
-- This will force regeneration with simplified cache keys
DELETE FROM recommendations_cache 
WHERE cache_key LIKE '%{%' -- Remove entries with JSON preference data in key
   OR cache_key NOT LIKE 'popular_%' 
   AND cache_key NOT LIKE 'explore_%'; -- Remove entries without proper prefixes

-- Update cache cleanup function to handle new simplified format
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
  
  -- Also clean up legacy cache entries without proper prefixes  
  DELETE FROM public.recommendations_cache
  WHERE cache_key NOT LIKE 'popular_%' 
    AND cache_key NOT LIKE 'explore_%'
    AND created_at < now() - interval '1 day';
END;
$function$