-- Enhanced Security Hardening Migration
-- Addresses location privacy, session security, business data protection, and audit logging

-- 1. Enhanced Location Data Protection
-- Add location access audit logging
CREATE TABLE IF NOT EXISTS public.location_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  accessed_user_id UUID,
  access_type TEXT NOT NULL, -- 'profile_view', 'coordinate_hash', 'distance_calc'
  ip_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.location_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view location access logs
CREATE POLICY "Only admins can view location access logs" 
ON public.location_access_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert location access logs
CREATE POLICY "System can create location access logs" 
ON public.location_access_logs 
FOR INSERT 
WITH CHECK (true);

-- 2. Session Security Improvements
-- Hash IP addresses in user_sessions table
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS ip_hash TEXT,
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS security_score INTEGER DEFAULT 100;

-- Update existing IP addresses to hashed versions (one-time operation)
UPDATE public.user_sessions 
SET ip_hash = md5(host(ip_address)::text) 
WHERE ip_hash IS NULL AND ip_address IS NOT NULL;

-- Enhanced session validation function
CREATE OR REPLACE FUNCTION public.validate_session_security(
  p_session_id TEXT,
  p_user_agent TEXT,
  p_ip_address INET
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_session RECORD;
  fingerprint_hash TEXT;
  ip_hash TEXT;
  ua_hash TEXT;
  security_score INTEGER := 100;
  result JSONB;
BEGIN
  -- Generate hashes for comparison using md5
  fingerprint_hash := md5(p_user_agent || p_ip_address::text);
  ip_hash := md5(host(p_ip_address));
  ua_hash := md5(p_user_agent);
  
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

-- 3. Business Data Access Controls
-- Add rate limiting for business data access
CREATE TABLE IF NOT EXISTS public.business_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  business_name TEXT,
  place_id TEXT,
  access_type TEXT NOT NULL, -- 'phone_access', 'details_view', 'bulk_query'
  ip_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view business access logs
CREATE POLICY "Only admins can view business access logs" 
ON public.business_access_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create their own business access logs
CREATE POLICY "System can create business access logs" 
ON public.business_access_logs 
FOR INSERT 
WITH CHECK (true);

-- Enhanced business data access logging
CREATE OR REPLACE FUNCTION public.log_business_access(
  p_business_name TEXT,
  p_place_id TEXT DEFAULT NULL,
  p_access_type TEXT DEFAULT 'details_view'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Log business data access
  INSERT INTO public.business_access_logs (
    user_id, business_name, place_id, access_type, ip_hash
  ) VALUES (
    auth.uid(),
    p_business_name,
    p_place_id,
    p_access_type,
    md5('127.0.0.1') -- Placeholder for actual IP hash
  );
  
  -- Also log as security event for monitoring
  INSERT INTO public.security_events (
    event_type, severity, user_id, event_data
  ) VALUES (
    'business_data_access',
    'info',
    auth.uid(),
    jsonb_build_object(
      'business_name', p_business_name,
      'place_id', p_place_id,
      'access_type', p_access_type,
      'timestamp', now()
    )
  );
END;
$$;

-- 4. Enhanced User Session Policies
-- Restrict anonymous sessions to reduce abuse
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.user_sessions;
CREATE POLICY "Authenticated users can create sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Update existing session policy
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 5. Enhanced Profile Location Protection
-- Add trigger to log location data access
CREATE OR REPLACE FUNCTION public.log_location_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only log if location data (lat/lng) is being accessed
  IF (TG_OP = 'SELECT' OR TG_OP = 'UPDATE') AND 
     (OLD.latitude IS NOT NULL OR OLD.longitude IS NOT NULL) THEN
    
    INSERT INTO public.location_access_logs (
      user_id, accessed_user_id, access_type, ip_hash
    ) VALUES (
      auth.uid(),
      OLD.user_id,
      TG_OP::text,
      md5('127.0.0.1') -- Placeholder for actual IP hash
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Note: Triggers on SELECT are not supported in PostgreSQL for security reasons
-- Instead, we'll rely on application-level logging through the secure session hook

-- 6. Data Retention and Cleanup Policies
-- Enhanced cleanup function for old security events and sessions
CREATE OR REPLACE FUNCTION public.cleanup_security_events()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete old security events (keep 30 days)
  DELETE FROM public.security_events 
  WHERE created_at < now() - interval '30 days';
  
  -- Delete old secure sessions (keep 7 days)
  DELETE FROM public.secure_sessions 
  WHERE last_activity_at < now() - interval '7 days';
  
  -- Delete old location access logs (keep 90 days)
  DELETE FROM public.location_access_logs 
  WHERE created_at < now() - interval '90 days';
  
  -- Delete old business access logs (keep 30 days)
  DELETE FROM public.business_access_logs 
  WHERE created_at < now() - interval '30 days';
  
  -- Log cleanup completion
  INSERT INTO public.security_events (
    event_type, severity, event_data
  ) VALUES (
    'security_cleanup_completed',
    'info',
    jsonb_build_object(
      'cleanup_date', now(),
      'tables_cleaned', ARRAY['security_events', 'secure_sessions', 'location_access_logs', 'business_access_logs']
    )
  );
END;
$$;

-- 7. Security Monitoring Enhancements
-- Function to detect suspicious patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  suspicious_users RECORD;
BEGIN
  -- Detect users with excessive business data access
  FOR suspicious_users IN
    SELECT user_id, COUNT(*) as access_count
    FROM public.business_access_logs
    WHERE created_at > now() - interval '1 hour'
      AND access_type = 'phone_access'
    GROUP BY user_id
    HAVING COUNT(*) > 20
  LOOP
    INSERT INTO public.security_events (
      event_type, severity, user_id, event_data
    ) VALUES (
      'suspicious_business_access',
      'warning',
      suspicious_users.user_id,
      jsonb_build_object(
        'access_count', suspicious_users.access_count,
        'timeframe', '1 hour',
        'threshold_exceeded', 20
      )
    );
  END LOOP;
  
  -- Detect sessions with low security scores
  FOR suspicious_users IN
    SELECT user_id, COUNT(*) as low_score_sessions
    FROM public.secure_sessions
    WHERE security_score < 50
      AND last_activity_at > now() - interval '24 hours'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    INSERT INTO public.security_events (
      event_type, severity, user_id, event_data
    ) VALUES (
      'multiple_low_security_sessions',
      'warning',
      suspicious_users.user_id,
      jsonb_build_object(
        'low_score_sessions', suspicious_users.low_score_sessions,
        'timeframe', '24 hours'
      )
    );
  END LOOP;
END;
$$;

-- 8. Create indexes for performance on new security tables
CREATE INDEX IF NOT EXISTS idx_location_access_logs_user_id ON public.location_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_location_access_logs_accessed_user_id ON public.location_access_logs(accessed_user_id);
CREATE INDEX IF NOT EXISTS idx_location_access_logs_created_at ON public.location_access_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_business_access_logs_user_id ON public.business_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_business_access_logs_created_at ON public.business_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_business_access_logs_access_type ON public.business_access_logs(access_type);

CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_hash ON public.user_sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_security_score ON public.user_sessions(security_score);

-- 9. Enhanced cache access logging function
CREATE OR REPLACE FUNCTION public.log_cache_access(
  p_cache_type TEXT,
  p_access_pattern TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
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