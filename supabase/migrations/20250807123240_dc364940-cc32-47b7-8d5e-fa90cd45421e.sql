-- Fix security warning: Move extensions from public schema to proper schema
DROP EXTENSION IF EXISTS pg_cron CASCADE;
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Install extensions in proper schema (not public)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the scheduled cleanup job
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