-- Add master template functionality to properties table
ALTER TABLE public.properties 
ADD COLUMN is_master_template BOOLEAN DEFAULT FALSE,
ADD COLUMN template_category TEXT,
ADD COLUMN template_description TEXT;

-- Create index for master template queries
CREATE INDEX idx_properties_master_template ON public.properties(is_master_template) WHERE is_master_template = true;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.is_master_template IS 'Whether this property serves as a master template for copying';
COMMENT ON COLUMN public.properties.template_category IS 'Category of the master template (e.g., Urban Downtown, Suburban Family)';
COMMENT ON COLUMN public.properties.template_description IS 'Description of what makes this a good template';