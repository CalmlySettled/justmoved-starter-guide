-- Add contract_status to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN contract_status text NOT NULL DEFAULT 'pending';

-- Add constraint for valid contract statuses
ALTER TABLE public.user_roles 
ADD CONSTRAINT valid_contract_status 
CHECK (contract_status IN ('pending', 'active', 'suspended'));

-- Create function to check property manager contract status
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
      AND contract_status = 'active'
  )
$$;

-- Update RLS policies for properties to require active contract
DROP POLICY IF EXISTS "Property managers can manage their properties" ON public.properties;

CREATE POLICY "Property managers can manage their properties" ON public.properties
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'property_manager'
      AND contract_status = 'active'
  ) AND manager_id = auth.uid()
);

-- Update auto-assignment trigger to set pending status for new property managers
CREATE OR REPLACE FUNCTION public.auto_assign_property_manager_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Check if this signup came from property manager route
  IF NEW.raw_user_meta_data ->> 'signup_source' = 'property_manager' THEN
    -- Insert property manager role with pending contract status
    INSERT INTO public.user_roles (user_id, role, contract_status)
    VALUES (NEW.id, 'property_manager', 'pending')
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
        'contract_status', 'pending',
        'signup_source', 'property_manager_route',
        'email', NEW.email
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;