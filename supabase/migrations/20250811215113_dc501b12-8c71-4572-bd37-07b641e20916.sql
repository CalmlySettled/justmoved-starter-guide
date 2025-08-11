-- Fix security issue: Restrict recommendations_cache access to user's own data
-- Add user_id column to track cache ownership
ALTER TABLE public.recommendations_cache 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for better performance on user_id lookups
CREATE INDEX idx_recommendations_cache_user_id ON public.recommendations_cache(user_id);

-- Drop the overly permissive policy that allows all authenticated users to access cache
DROP POLICY IF EXISTS "Authenticated users can access location cache" ON public.recommendations_cache;

-- Create new restrictive policies
-- Users can only read their own cache entries
CREATE POLICY "Users can read their own cache entries" 
ON public.recommendations_cache 
FOR SELECT 
USING (auth.uid() = user_id AND expires_at > now());

-- Users can insert their own cache entries
CREATE POLICY "Users can insert their own cache entries" 
ON public.recommendations_cache 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- System can manage cache entries (for edge functions with service role)
CREATE POLICY "System can manage cache entries" 
ON public.recommendations_cache 
FOR ALL 
USING (auth.role() = 'service_role');

-- Update existing cache entries to have a default user_id (or they'll be inaccessible)
-- Note: This will make existing cache entries inaccessible to users, but preserves security
-- The cache will rebuild naturally as users make new requests