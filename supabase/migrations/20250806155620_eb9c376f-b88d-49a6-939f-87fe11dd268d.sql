-- Clear only the events cache to force fresh Ticketmaster API calls
DELETE FROM public.recommendations_cache 
WHERE cache_key LIKE 'events_%';