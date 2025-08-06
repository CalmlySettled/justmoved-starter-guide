-- Create or replace the trigger function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Create profile with all available signup data or sensible defaults
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
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
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
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    address = COALESCE(EXCLUDED.address, profiles.address),
    latitude = COALESCE(EXCLUDED.latitude, profiles.latitude),
    longitude = COALESCE(EXCLUDED.longitude, profiles.longitude),
    household_type = COALESCE(EXCLUDED.household_type, profiles.household_type),
    priorities = COALESCE(EXCLUDED.priorities, profiles.priorities),
    transportation_style = COALESCE(EXCLUDED.transportation_style, profiles.transportation_style),
    budget_preference = COALESCE(EXCLUDED.budget_preference, profiles.budget_preference),
    life_stage = COALESCE(EXCLUDED.life_stage, profiles.life_stage),
    settling_tasks = COALESCE(EXCLUDED.settling_tasks, profiles.settling_tasks),
    priority_preferences = COALESCE(EXCLUDED.priority_preferences, profiles.priority_preferences),
    distance_priority = COALESCE(EXCLUDED.distance_priority, profiles.distance_priority),
    updated_at = now();
    
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();