-- Add property_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_property_id ON public.profiles(property_id);

-- Add comment
COMMENT ON COLUMN public.profiles.property_id IS 'Links user to their property from QR code signup';