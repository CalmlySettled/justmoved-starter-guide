-- Create function to activate property managers
CREATE OR REPLACE FUNCTION public.activate_property_manager(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Only admins can activate property managers
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can activate property managers';
  END IF;
  
  -- Update contract status to active
  UPDATE public.user_roles 
  SET 
    contract_status = 'active',
    updated_at = now()
  WHERE user_id = p_user_id 
    AND role = 'property_manager'::app_role;
    
  -- Log the activation
  INSERT INTO public.security_events (
    event_type, severity, user_id, event_data
  ) VALUES (
    'property_manager_activated',
    'info',
    auth.uid(),
    jsonb_build_object(
      'activated_user_id', p_user_id,
      'activated_by', auth.uid(),
      'timestamp', now()
    )
  );
END;
$function$;

-- Immediately activate hello@calmlysettled.com account
-- First get the user_id for hello@calmlysettled.com
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Find the user ID for hello@calmlysettled.com
    SELECT au.id INTO target_user_id
    FROM auth.users au
    WHERE au.email = 'hello@calmlysettled.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Update their contract status to active
        UPDATE public.user_roles 
        SET 
            contract_status = 'active',
            updated_at = now()
        WHERE user_id = target_user_id 
          AND role = 'property_manager'::app_role;
          
        -- Log the activation
        INSERT INTO public.security_events (
            event_type, severity, user_id, event_data
        ) VALUES (
            'property_manager_activated',
            'info',
            target_user_id,
            jsonb_build_object(
                'activated_user_id', target_user_id,
                'activated_by', 'system',
                'reason', 'initial_admin_activation',
                'timestamp', now()
            )
        );
    END IF;
END $$;