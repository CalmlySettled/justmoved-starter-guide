-- Create table to store user recommendations
CREATE TABLE public.user_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_address TEXT,
  business_description TEXT,
  business_phone TEXT,
  business_features TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own recommendations" 
ON public.user_recommendations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendations" 
ON public.user_recommendations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" 
ON public.user_recommendations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations" 
ON public.user_recommendations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_recommendations_updated_at
BEFORE UPDATE ON public.user_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();