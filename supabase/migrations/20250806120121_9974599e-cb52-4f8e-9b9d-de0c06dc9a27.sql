-- Clear problematic pharmacy cache entries
DELETE FROM public.recommendations_cache 
WHERE cache_key LIKE '%pharmacy%' OR cache_key LIKE '%pharmacies%';