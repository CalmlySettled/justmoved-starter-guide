-- Fix the RLS policy for user_activity_events to allow both authenticated and anonymous analytics
DROP POLICY IF EXISTS "Users can create their own events" ON public.user_activity_events;

CREATE POLICY "Users can create analytics events" 
ON public.user_activity_events 
FOR INSERT 
WITH CHECK (
  -- Allow authenticated users to insert their own events
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Allow anonymous users to insert events with null user_id
  (auth.uid() IS NULL AND user_id IS NULL)
);