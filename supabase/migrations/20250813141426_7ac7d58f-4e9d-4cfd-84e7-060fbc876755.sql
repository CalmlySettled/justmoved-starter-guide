-- Enhance property manager inquiries table with admin features
ALTER TABLE public.property_manager_inquiries 
ADD COLUMN admin_notes TEXT,
ADD COLUMN contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;

-- Update status field to use better enum values
ALTER TABLE public.property_manager_inquiries 
ALTER COLUMN status SET DEFAULT 'new';

-- Update existing 'pending' records to 'new'
UPDATE public.property_manager_inquiries 
SET status = 'new' 
WHERE status = 'pending';