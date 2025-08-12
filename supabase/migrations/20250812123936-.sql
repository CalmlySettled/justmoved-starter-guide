-- Fix the search path security issue for the extract_city_state function
CREATE OR REPLACE FUNCTION extract_city_state(full_address TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- If address is null or empty, return null
  IF full_address IS NULL OR trim(full_address) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Extract city, state from full address (assumes format like "123 Main St, Hartford, CT" or "Hartford, CT")
  -- Split by comma and take the last two parts (city, state)
  DECLARE
    address_parts TEXT[];
    city_state_part TEXT;
  BEGIN
    address_parts := string_to_array(full_address, ',');
    
    -- If we have at least 2 parts after splitting by comma
    IF array_length(address_parts, 1) >= 2 THEN
      -- Take the last two parts and trim whitespace
      city_state_part := trim(address_parts[array_length(address_parts, 1) - 1]) || ', ' || trim(address_parts[array_length(address_parts, 1)]);
      RETURN city_state_part;
    ELSE
      -- If no comma found, return the original (might already be city, state)
      RETURN trim(full_address);
    END IF;
  END;
END;
$$;