-- Enable pg_cron extension for scheduled cleanup jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create scheduled cleanup job for cache tables (daily at 2 AM UTC)
SELECT cron.schedule(
  'daily-cache-cleanup',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://ghbnvodnnxgxkiufcael.supabase.co/functions/v1/cleanup-cache',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoYm52b2RubnhneGtpdWZjYWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4ODQ4MzEsImV4cCI6MjA2ODQ2MDgzMX0.zxcaTXyNmZO2-YbKiiNeNv1xTfnR2Jp9k-P4JqFgOa0"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to get cache statistics for monitoring
CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec_count INTEGER;
  rec_size BIGINT;
  bus_count INTEGER;
  bus_size BIGINT;
  expired_rec INTEGER;
  expired_bus INTEGER;
BEGIN
  -- Get recommendations cache stats
  SELECT COUNT(*), 
         COALESCE(SUM(pg_column_size(recommendations)), 0)
  INTO rec_count, rec_size
  FROM public.recommendations_cache
  WHERE expires_at > now();
  
  -- Get expired recommendations count
  SELECT COUNT(*)
  INTO expired_rec
  FROM public.recommendations_cache
  WHERE expires_at <= now();
  
  -- Get business cache stats
  SELECT COUNT(*), 
         COALESCE(SUM(pg_column_size(opening_hours) + pg_column_size(features)), 0)
  INTO bus_count, bus_size
  FROM public.business_cache
  WHERE expires_at > now();
  
  -- Get expired business cache count
  SELECT COUNT(*)
  INTO expired_bus
  FROM public.business_cache
  WHERE expires_at <= now();
  
  RETURN jsonb_build_object(
    'recommendations_cache', jsonb_build_object(
      'active_entries', rec_count,
      'size_bytes', rec_size,
      'expired_entries', expired_rec
    ),
    'business_cache', jsonb_build_object(
      'active_entries', bus_count,
      'size_bytes', bus_size,
      'expired_entries', expired_bus
    ),
    'total_size_bytes', rec_size + bus_size,
    'last_updated', now()
  );
END;
$$;