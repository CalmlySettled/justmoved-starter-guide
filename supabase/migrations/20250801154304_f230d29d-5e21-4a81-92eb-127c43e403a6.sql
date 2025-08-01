-- Update cache expiration from 30 days to 120 days for cost optimization
ALTER TABLE public.recommendations_cache 
ALTER COLUMN expires_at SET DEFAULT (now() + '120 days'::interval);