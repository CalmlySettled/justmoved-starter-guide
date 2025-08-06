-- Update the handle_new_user function to also save address and location data from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Create profile with all available signup data
  INSERT INTO public.profiles (
    user_id, 
    display_name,
    address,
    latitude,
    longitude,
    household_type,
    priorities,
    transportation_style,
    budget_preference,
    life_stage,
    settling_tasks,
    priority_preferences,
    distance_priority
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'address',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'latitude' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'latitude')::real
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'longitude' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'longitude')::real
      ELSE NULL
    END,
    COALESCE(NEW.raw_user_meta_data ->> 'household_type', 'Not specified'),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'priorities' IS NOT NULL 
      THEN string_to_array(NEW.raw_user_meta_data ->> 'priorities', ',')
      ELSE ARRAY['Convenience']
    END,
    COALESCE(NEW.raw_user_meta_data ->> 'transportation_style', 'Flexible'),
    COALESCE(NEW.raw_user_meta_data ->> 'budget_preference', 'Moderate'),
    COALESCE(NEW.raw_user_meta_data ->> 'life_stage', 'Getting settled'),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'settling_tasks' IS NOT NULL 
      THEN string_to_array(NEW.raw_user_meta_data ->> 'settling_tasks', ',')
      ELSE ARRAY[]::text[]
    END,
    COALESCE((NEW.raw_user_meta_data ->> 'priority_preferences')::jsonb, '{}'::jsonb),
    COALESCE((NEW.raw_user_meta_data ->> 'distance_priority')::boolean, true)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    household_type = EXCLUDED.household_type,
    priorities = EXCLUDED.priorities,
    transportation_style = EXCLUDED.transportation_style,
    budget_preference = EXCLUDED.budget_preference,
    life_stage = EXCLUDED.life_stage,
    settling_tasks = EXCLUDED.settling_tasks,
    priority_preferences = EXCLUDED.priority_preferences,
    distance_priority = EXCLUDED.distance_priority,
    updated_at = now();
    
  RETURN NEW;
END;
$function$;