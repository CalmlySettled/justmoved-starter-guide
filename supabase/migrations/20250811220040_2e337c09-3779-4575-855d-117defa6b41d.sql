-- Fix analytics foreign key constraint issue
-- Remove foreign key constraint on user_activity_events.user_id to allow analytics for anonymous users
-- This prevents constraint violation errors while maintaining analytics functionality

-- First, check if there's a foreign key constraint on user_id and remove it
DO $$ 
BEGIN
    -- Drop foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%user_activity_events_user_id_fkey%' 
        AND table_name = 'user_activity_events'
    ) THEN
        ALTER TABLE public.user_activity_events 
        DROP CONSTRAINT user_activity_events_user_id_fkey;
    END IF;
END $$;

-- Ensure the user_id column can be null (for anonymous analytics)
ALTER TABLE public.user_activity_events 
ALTER COLUMN user_id DROP NOT NULL;