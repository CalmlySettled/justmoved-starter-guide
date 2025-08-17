-- Create subscription tiers table (simplified for single tier)
CREATE TABLE public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_per_property DECIMAL(10,2) NOT NULL,
  signup_fee DECIMAL(10,2) NOT NULL,
  trial_days INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table for property managers
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier_id UUID REFERENCES public.subscription_tiers(id),
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, past_due, canceled
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  properties_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenant signup charges table for $0.75 per signup tracking
CREATE TABLE public.tenant_signup_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id),
  tenant_link_id UUID REFERENCES public.tenant_links(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  charge_amount DECIMAL(10,2) NOT NULL DEFAULT 0.75,
  stripe_usage_record_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, charged, failed
  signup_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  charged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_signup_charges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_tiers (public read)
CREATE POLICY "Anyone can view subscription tiers" 
ON public.subscription_tiers 
FOR SELECT 
USING (true);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for tenant_signup_charges
CREATE POLICY "Property managers can view charges for their properties" 
ON public.tenant_signup_charges 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.properties p 
  WHERE p.id = tenant_signup_charges.property_id 
  AND p.manager_id = auth.uid()
));

CREATE POLICY "System can insert signup charges" 
ON public.tenant_signup_charges 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update signup charges" 
ON public.tenant_signup_charges 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can view all signup charges" 
ON public.tenant_signup_charges 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default subscription tier
INSERT INTO public.subscription_tiers (name, price_per_property, signup_fee, trial_days)
VALUES ('Standard', 49.99, 0.75, 14);

-- Create function to update subscription property count
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update property counts
CREATE TRIGGER update_subscription_property_count_trigger
  AFTER INSERT OR DELETE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_property_count();

-- Create function to handle tenant signup billing
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log tenant signup charges
CREATE OR REPLACE FUNCTION public.auto_log_tenant_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Log signup charge when a new tenant link is created
  PERFORM public.log_tenant_signup_charge(NEW.property_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_log_tenant_signup_trigger
  AFTER INSERT ON public.tenant_links
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_tenant_signup();