-- Update handle_new_user function to include property_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Create profile with all available signup data including property_id
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
    distance_priority,
    property_id
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
    COALESCE((NEW.raw_user_meta_data ->> 'distance_priority')::boolean, true),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'property_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'property_id')::uuid
      ELSE NULL
    END
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
    property_id = COALESCE(EXCLUDED.property_id, profiles.property_id),
    updated_at = now();
    
  RETURN NEW;
END;
$function$;

-- Fix existing test users - set property_id for users with the test property token
UPDATE public.profiles 
SET property_id = '08fb7d54-4287-4aef-a9c8-6c241a9fdefd'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE raw_user_meta_data->>'property_token' = 'prop_1755089235_28e5688f'
);