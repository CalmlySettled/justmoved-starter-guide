-- Create property manager inquiries table
CREATE TABLE public.property_manager_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  property_count TEXT,
  property_type TEXT,
  current_solution TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.property_manager_inquiries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can submit property manager inquiries" 
ON public.property_manager_inquiries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only admins can view property manager inquiries" 
ON public.property_manager_inquiries 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update property manager inquiries" 
ON public.property_manager_inquiries 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_property_manager_inquiries_updated_at
BEFORE UPDATE ON public.property_manager_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();