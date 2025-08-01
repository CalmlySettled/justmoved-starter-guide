-- Create recommendations cache table to reduce API costs
CREATE TABLE public.recommendations_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  user_coordinates POINT NOT NULL,
  recommendations JSONB NOT NULL,
  categories TEXT[] NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.recommendations_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for cache access
CREATE POLICY "Anyone can read unexpired cache entries" 
ON public.recommendations_cache 
FOR SELECT 
USING (expires_at > now());

CREATE POLICY "System can create cache entries" 
ON public.recommendations_cache 
FOR INSERT 
WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_recommendations_cache_key ON public.recommendations_cache(cache_key);
CREATE INDEX idx_recommendations_cache_location ON public.recommendations_cache USING GIST(user_coordinates);
CREATE INDEX idx_recommendations_cache_expires ON public.recommendations_cache(expires_at);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.recommendations_cache 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;