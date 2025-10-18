-- Remove contract_status system and enable immediate PM access

-- Step 1: Update all pending contracts to active (so we don't lose any PMs)
UPDATE public.user_roles 
SET contract_status = 'active' 
WHERE contract_status = 'pending' AND role = 'property_manager';

-- Step 2: Drop the activate_property_manager function (no longer needed)
DROP FUNCTION IF EXISTS public.activate_property_manager(uuid);

-- Step 3: Update has_role function to remove contract_status check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 4: Update has_active_pm_contract to just check role existence
CREATE OR REPLACE FUNCTION public.has_active_pm_contract(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'property_manager'
  )
$$;

-- Step 5: Update auto_assign_property_manager_role trigger to not set contract_status
CREATE OR REPLACE FUNCTION public.auto_assign_property_manager_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if this signup came from property manager route
  IF NEW.raw_user_meta_data ->> 'signup_source' = 'property_manager' THEN
    -- Insert property manager role (no contract_status needed)
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

-- Step 6: Update RLS policy on properties table
DROP POLICY IF EXISTS "Property managers can manage their properties" ON public.properties;

CREATE POLICY "Property managers can manage their properties" 
ON public.properties
FOR ALL
USING (
  (EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'property_manager'
  )) 
  AND manager_id = auth.uid()
);

-- Step 7: Create admin notification function for new properties
CREATE OR REPLACE FUNCTION public.notify_admin_new_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Call edge function to send admin notification email
  PERFORM net.http_post(
    url := 'https://ghbnvodnnxgxkiufcael.supabase.co/functions/v1/send-pm-property-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoYm52b2RubnhneGtpdWZjYWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4ODQ4MzEsImV4cCI6MjA2ODQ2MDgzMX0.zxcaTXyNmZO2-YbKiiNeNv1xTfnR2Jp9k-P4JqFgOa0'
    ),
    body := jsonb_build_object(
      'property_id', NEW.id,
      'property_name', NEW.property_name,
      'address', NEW.address,
      'manager_id', NEW.manager_id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Step 8: Create trigger to notify admin when new property is added
DROP TRIGGER IF EXISTS notify_admin_on_new_property ON public.properties;

CREATE TRIGGER notify_admin_on_new_property
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_property();

-- Step 9: Now safely remove contract_status column from user_roles
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS contract_status;

-- Step 10: Log migration completion
INSERT INTO public.security_events (
  event_type, severity, event_data
) VALUES (
  'migration_completed',
  'info',
  jsonb_build_object(
    'migration', 'remove_contract_status_system',
    'description', 'Removed contract_status approval gate for property managers',
    'timestamp', now()
  )
);