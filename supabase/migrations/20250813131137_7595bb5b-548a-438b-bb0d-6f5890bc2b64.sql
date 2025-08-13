-- Function to auto-assign property manager role during signup from property manager route
CREATE OR REPLACE FUNCTION public.auto_assign_property_manager_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if this signup came from property manager route
  -- We'll check for a special flag in the user metadata
  IF NEW.raw_user_meta_data ->> 'signup_source' = 'property_manager' THEN
    -- Insert property manager role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'property_manager')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the role assignment
    INSERT INTO public.security_events (
      event_type, severity, user_id, event_data
    ) VALUES (
      'auto_role_assignment',
      'info',
      NEW.id,
      jsonb_build_object(
        'role', 'property_manager',
        'signup_source', 'property_manager_route',
        'email', NEW.email
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto role assignment
CREATE TRIGGER auto_assign_property_manager_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_property_manager_role();