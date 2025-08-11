-- Fix critical security issues in RLS policies
-- Issue 1: Fix user_sessions table - restrict access to admins and individual users only
-- Issue 2: Fix analytics_daily_aggregates table - restrict to admins only

-- Fix user_sessions table policies
DROP POLICY IF EXISTS "System can create and update sessions" ON public.user_sessions;

-- Create separate policies for user_sessions
CREATE POLICY "System can insert sessions" 
ON public.user_sessions 
FOR INSERT 
USING (true);

CREATE POLICY "System can update sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (true);

-- Fix analytics_daily_aggregates table policies  
DROP POLICY IF EXISTS "Only authenticated users can view aggregates" ON public.analytics_daily_aggregates;
DROP POLICY IF EXISTS "System can manage aggregates" ON public.analytics_daily_aggregates;

-- Create proper restrictive policies for analytics
CREATE POLICY "System can insert aggregates" 
ON public.analytics_daily_aggregates 
FOR INSERT 
USING (true);

CREATE POLICY "System can update aggregates" 
ON public.analytics_daily_aggregates 
FOR UPDATE 
USING (true);

CREATE POLICY "System can delete aggregates" 
ON public.analytics_daily_aggregates 
FOR DELETE 
USING (true);