-- Create business cache table to eliminate expensive repeated Google API calls
CREATE TABLE public.business_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  address TEXT,
  latitude REAL,
  longitude REAL,
  rating REAL,
  features TEXT[],
  
  -- Expensive cached data from Google APIs
  photo_url TEXT,
  website TEXT,
  phone TEXT,
  opening_hours JSONB,
  business_status TEXT,
  
  -- Cache metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '180 days'),
  
  -- Geographic indexing for fast lookups
  location POINT GENERATED ALWAYS AS (POINT(longitude, latitude)) STORED
);

-- Enable Row Level Security
ALTER TABLE public.business_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for business cache (read-only for users, write for system)
CREATE POLICY "Anyone can read business cache" 
ON public.business_cache 
FOR SELECT 
USING (expires_at > now());

CREATE POLICY "System can create business cache entries" 
ON public.business_cache 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update business cache entries" 
ON public.business_cache 
FOR UPDATE 
USING (true);

-- Create indexes for fast lookups
CREATE INDEX idx_business_cache_place_id ON public.business_cache(place_id);
CREATE INDEX idx_business_cache_location ON public.business_cache USING GIST(location);
CREATE INDEX idx_business_cache_expires_at ON public.business_cache(expires_at);
CREATE INDEX idx_business_cache_name_address ON public.business_cache(business_name, address);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_cache_updated_at
BEFORE UPDATE ON public.business_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clean up expired business cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_business_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Delete expired business cache entries
  DELETE FROM public.business_cache 
  WHERE expires_at < now();
  
  -- Log cleanup
  RAISE NOTICE 'Cleaned up expired business cache entries';
END;
$function$;