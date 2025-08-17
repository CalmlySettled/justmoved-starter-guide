-- Add property token field to properties table for property-wide QR codes
ALTER TABLE public.properties 
ADD COLUMN property_token text UNIQUE;

-- Generate property tokens for existing properties
UPDATE public.properties 
SET property_token = 'prop_' || extract(epoch from created_at)::bigint || '_' || substr(md5(random()::text), 1, 8)
WHERE property_token IS NULL;

-- Make property_token NOT NULL after setting values
ALTER TABLE public.properties 
ALTER COLUMN property_token SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_properties_property_token ON public.properties(property_token);

-- Add function to auto-generate property tokens for new properties
CREATE OR REPLACE FUNCTION public.generate_property_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.property_token IS NULL THEN
    NEW.property_token := 'prop_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate property tokens
CREATE TRIGGER generate_property_token_trigger
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_property_token();