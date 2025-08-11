-- Check what views currently exist and identify any potential security issues
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'VIEW';

-- Also check for any remaining business_cache_public references
SELECT viewname, definition 
FROM pg_views 
WHERE viewname LIKE '%business_cache%';