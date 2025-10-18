-- Drop the public access policy on subscription_tiers
DROP POLICY IF EXISTS "Anyone can view subscription tiers" ON public.subscription_tiers;

-- Create new policy: Only property managers can view subscription tiers
CREATE POLICY "Property managers can view subscription tiers"
ON public.subscription_tiers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'property_manager'::app_role)
);

-- Also allow admins to view subscription tiers
CREATE POLICY "Admins can view subscription tiers"
ON public.subscription_tiers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);