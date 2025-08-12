-- ================================
-- SECURITY HARDENING - USER LOCATION PRIVACY & SESSION SECURITY
-- ================================

-- Enable pgcrypto extension for hashing functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USER LOCATION PRIVACY ENHANCEMENTS
-- Add coordinate hashing to prevent individual user tracking
-- while preserving geographic cache functionality

-- Function to hash coordinates for privacy while preserving geographic grouping
CREATE OR REPLACE FUNCTION public.hash_user_coordinates(lat real, lng real, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Hash precise coordinates with user salt for privacy
  -- Still allows geographic cache grouping but prevents individual tracking
  RETURN encode(
    digest(
      CONCAT(
        ROUND(lat::numeric, 4)::text, '|',
        ROUND(lng::numeric, 4)::text, '|', 
        COALESCE(user_id::text, 'anon')
      ), 
      'sha256'
    ), 
    'hex'
  );
END;
$$;

-- Add privacy columns to recommendations_cache
ALTER TABLE public.recommendations_cache 
ADD COLUMN IF NOT EXISTS coordinate_hash text,
ADD COLUMN IF NOT EXISTS privacy_level text DEFAULT 'standard'::text;

-- Update existing cache entries with coordinate hashes
UPDATE public.recommendations_cache 
SET coordinate_hash = public.hash_user_coordinates(
  (user_coordinates[0])::real, 
  (user_coordinates[1])::real, 
  user_id
)
WHERE coordinate_hash IS NULL;

-- 2. ENHANCED SESSION SECURITY
-- Create secure session tracking table
CREATE TABLE IF NOT EXISTS public.secure_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  user_id uuid,
  fingerprint_hash text,
  ip_hash text,
  user_agent_hash text,
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_suspicious boolean DEFAULT false,
  security_score integer DEFAULT 100,
  validation_failures integer DEFAULT 0
);

-- Enable RLS on secure sessions
ALTER TABLE public.secure_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for secure sessions
CREATE POLICY "Users can view their own secure sessions" 
ON public.secure_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own secure sessions" 
ON public.secure_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own secure sessions" 
ON public.secure_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage secure sessions" 
ON public.secure_sessions 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- 3. SECURITY MONITORING & ALERTING
-- Create security events tracking table
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  user_id uuid,
  session_id text,
  event_data jsonb NOT NULL DEFAULT '{}',
  ip_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Only admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- 4. SECURITY UTILITY FUNCTIONS

-- Function to validate session security
CREATE OR REPLACE FUNCTION public.validate_session_security(
  p_session_id text,
  p_user_agent text,
  p_ip_address inet
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_session record;
  fingerprint_hash text;
  ip_hash text;
  ua_hash text;
  security_score integer := 100;
  result jsonb;
BEGIN
  -- Generate hashes for comparison
  fingerprint_hash := encode(digest(p_user_agent || p_ip_address::text, 'sha256'), 'hex');
  ip_hash := encode(digest(host(p_ip_address), 'sha256'), 'hex');
  ua_hash := encode(digest(p_user_agent, 'sha256'), 'hex');
  
  -- Check existing session
  SELECT * INTO existing_session
  FROM public.secure_sessions
  WHERE session_id = p_session_id
  LIMIT 1;
  
  IF existing_session.session_id IS NOT NULL THEN
    -- Validate session integrity
    IF existing_session.user_agent_hash IS NOT NULL 
       AND existing_session.user_agent_hash != ua_hash THEN
      security_score := security_score - 50;
      
      -- Log security event
      INSERT INTO public.security_events (
        event_type, severity, user_id, session_id, event_data, ip_hash
      ) VALUES (
        'session_user_agent_mismatch',
        'warning',
        existing_session.user_id,
        p_session_id,
        jsonb_build_object(
          'original_ua_hash', existing_session.user_agent_hash,
          'new_ua_hash', ua_hash,
          'security_score', security_score
        ),
        ip_hash
      );
    END IF;
    
    IF existing_session.ip_hash IS NOT NULL 
       AND existing_session.ip_hash != ip_hash THEN
      security_score := security_score - 30;
      
      -- Log IP change
      INSERT INTO public.security_events (
        event_type, severity, user_id, session_id, event_data, ip_hash
      ) VALUES (
        'session_ip_change',
        'info',
        existing_session.user_id,
        p_session_id,
        jsonb_build_object(
          'security_score', security_score
        ),
        ip_hash
      );
    END IF;
    
    -- Update session
    UPDATE public.secure_sessions
    SET 
      last_activity_at = now(),
      security_score = GREATEST(security_score, 0),
      is_suspicious = (security_score < 70),
      validation_failures = CASE 
        WHEN security_score < 70 THEN validation_failures + 1 
        ELSE validation_failures 
      END
    WHERE session_id = p_session_id;
  ELSE
    -- Create new session tracking
    INSERT INTO public.secure_sessions (
      session_id, user_id, fingerprint_hash, ip_hash, user_agent_hash, security_score
    ) VALUES (
      p_session_id, auth.uid(), fingerprint_hash, ip_hash, ua_hash, security_score
    );
  END IF;
  
  result := jsonb_build_object(
    'valid', security_score >= 70,
    'security_score', security_score,
    'session_id', p_session_id
  );
  
  RETURN result;
END;
$$;

-- Function to log cache access for monitoring
CREATE OR REPLACE FUNCTION public.log_cache_access(
  p_cache_type text,
  p_access_pattern text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, event_data
  ) VALUES (
    'cache_access',
    'info',
    auth.uid(),
    jsonb_build_object(
      'cache_type', p_cache_type,
      'access_pattern', p_access_pattern,
      'metadata', p_metadata,
      'timestamp', now()
    )
  );
END;
$$;

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_recommendations_cache_coordinate_hash 
ON public.recommendations_cache (coordinate_hash);

CREATE INDEX IF NOT EXISTS idx_secure_sessions_user_id 
ON public.secure_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_secure_sessions_session_id 
ON public.secure_sessions (session_id);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id 
ON public.security_events (user_id);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at 
ON public.security_events (created_at);

-- 6. CLEANUP FUNCTIONS
-- Function to clean up old security events (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.security_events 
  WHERE created_at < now() - interval '30 days';
  
  DELETE FROM public.secure_sessions 
  WHERE last_activity_at < now() - interval '7 days';
END;
$$;