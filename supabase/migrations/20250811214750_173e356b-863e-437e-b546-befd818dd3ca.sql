-- Remove conflicting RLS policies that allow users to view their own analytics data
-- This resolves security warnings about policy conflicts on sensitive tracking tables

-- Drop the user self-access policy from user_activity_events
DROP POLICY IF EXISTS "Users can view their own events" ON public.user_activity_events;

-- Drop the user self-access policy from user_sessions  
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;

-- Keep only the admin-only policies for both tables
-- This ensures sensitive user tracking data is only accessible to administrators