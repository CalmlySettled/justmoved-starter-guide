-- Update profiles table to use full address instead of zip code
ALTER TABLE public.profiles DROP COLUMN IF EXISTS zip_code;
ALTER TABLE public.profiles ADD COLUMN address TEXT;
ALTER TABLE public.profiles ADD COLUMN latitude REAL;
ALTER TABLE public.profiles ADD COLUMN longitude REAL;

-- Update user_recommendations table to include distance information
ALTER TABLE public.user_recommendations ADD COLUMN distance_miles REAL;
ALTER TABLE public.user_recommendations ADD COLUMN business_latitude REAL;
ALTER TABLE public.user_recommendations ADD COLUMN business_longitude REAL;