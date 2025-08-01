-- Update the recommendations_cache table to use 30-day expiration by default
ALTER TABLE public.recommendations_cache 
ALTER COLUMN expires_at SET DEFAULT (now() + '30 days'::interval);