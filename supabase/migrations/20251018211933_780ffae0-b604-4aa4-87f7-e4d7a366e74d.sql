-- Step 1: Update existing pending property managers to active
UPDATE public.user_roles 
SET contract_status = 'active'
WHERE role = 'property_manager' AND contract_status = 'pending';

-- Step 2: Drop the activate_property_manager function (no longer needed)
DROP FUNCTION IF EXISTS public.activate_property_manager(uuid);

-- Step 3: Update has_role function to not check contract_status
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 4: Update has_active_pm_contract to just check for PM role
CREATE OR REPLACE FUNCTION public.has_active_pm_contract(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'property_manager'
  )
$$;

-- Step 5: Update RLS policies to remove contract_status checks
DROP POLICY IF EXISTS "Property managers can manage their properties" ON public.properties;
CREATE POLICY "Property managers can manage their properties" 
ON public.properties 
FOR ALL 
USING (
  (EXISTS ( SELECT 1
     FROM user_roles
    WHERE ((user_roles.user_id = auth.uid()) 
      AND (user_roles.role = 'property_manager'::app_role))
  )) AND (manager_id = auth.uid())
);

-- Step 6: Create edge function trigger for admin notification on new property
CREATE OR REPLACE FUNCTION public.notify_admin_new_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Call edge function to send admin notification email
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-pm-property-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
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

-- Create trigger
DROP TRIGGER IF EXISTS notify_admin_on_new_property ON public.properties;
CREATE TRIGGER notify_admin_on_new_property
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_property();

-- Step 7: Log migration completion
INSERT INTO public.security_events (
  event_type, severity, event_data
) VALUES (
  'pm_contract_system_removed',
  'info',
  jsonb_build_object(
    'migration_date', now(),
    'description', 'Removed pending approval gate for property managers',
    'changes', ARRAY[
      'Set all pending PMs to active',
      'Removed contract_status from has_role checks',
      'Added trigger for admin notification on new property',
      'Updated RLS policies'
    ]
  )
);