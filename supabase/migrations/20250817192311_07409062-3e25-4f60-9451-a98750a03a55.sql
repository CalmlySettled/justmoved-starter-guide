-- Fix security warnings by setting search_path on functions
CREATE OR REPLACE FUNCTION public.update_subscription_property_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update property count when properties are added/removed
  IF TG_OP = 'INSERT' THEN
    UPDATE public.subscriptions 
    SET properties_count = properties_count + 1,
        updated_at = now()
    WHERE user_id = NEW.manager_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.subscriptions 
    SET properties_count = properties_count - 1,
        updated_at = now()
    WHERE user_id = OLD.manager_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.log_tenant_signup_charge(
  p_property_id UUID,
  p_tenant_link_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
  v_charge_id UUID;
BEGIN
  -- Get the subscription for this property
  SELECT s.id INTO v_subscription_id
  FROM public.subscriptions s
  JOIN public.properties p ON p.manager_id = s.user_id
  WHERE p.id = p_property_id
  AND s.status = 'active';
  
  -- Create charge record if subscription exists
  IF v_subscription_id IS NOT NULL THEN
    INSERT INTO public.tenant_signup_charges (
      property_id, tenant_link_id, subscription_id, charge_amount
    ) VALUES (
      p_property_id, p_tenant_link_id, v_subscription_id, 0.75
    ) RETURNING id INTO v_charge_id;
  END IF;
  
  RETURN v_charge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.auto_log_tenant_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Log signup charge when a new tenant link is created
  PERFORM public.log_tenant_signup_charge(NEW.property_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';