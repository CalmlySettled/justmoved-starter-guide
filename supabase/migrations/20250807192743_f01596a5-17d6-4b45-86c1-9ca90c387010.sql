-- Create user activity tracking tables
CREATE TABLE public.user_activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user sessions table
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  page_views INTEGER DEFAULT 0,
  recommendations_viewed INTEGER DEFAULT 0,
  recommendations_clicked INTEGER DEFAULT 0,
  favorites_added INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  user_agent TEXT,
  ip_address INET
);

-- Create analytics aggregations table for performance
CREATE TABLE public.analytics_daily_aggregates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, metric_type, metric_key)
);

-- Enable RLS
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activity_events
CREATE POLICY "Users can view their own events" 
ON public.user_activity_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create events" 
ON public.user_activity_events 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create and update sessions" 
ON public.user_sessions 
FOR ALL 
USING (true);

-- RLS Policies for analytics_daily_aggregates (admin only)
CREATE POLICY "Only authenticated users can view aggregates" 
ON public.analytics_daily_aggregates 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage aggregates" 
ON public.analytics_daily_aggregates 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_activity_events_user_id ON public.user_activity_events(user_id);
CREATE INDEX idx_user_activity_events_session_id ON public.user_activity_events(session_id);
CREATE INDEX idx_user_activity_events_created_at ON public.user_activity_events(created_at);
CREATE INDEX idx_user_activity_events_event_type ON public.user_activity_events(event_type);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at);
CREATE INDEX idx_analytics_daily_aggregates_date ON public.analytics_daily_aggregates(date);

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION public.aggregate_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing aggregates for the date
  DELETE FROM public.analytics_daily_aggregates WHERE date = target_date;
  
  -- Aggregate page views by category
  INSERT INTO public.analytics_daily_aggregates (date, metric_type, metric_key, metric_value, metadata)
  SELECT 
    target_date,
    'page_views',
    event_data->>'category' as metric_key,
    COUNT(*) as metric_value,
    jsonb_build_object('event_type', 'page_view') as metadata
  FROM public.user_activity_events 
  WHERE DATE(created_at) = target_date 
    AND event_type = 'page_view'
    AND event_data->>'category' IS NOT NULL
  GROUP BY event_data->>'category';
  
  -- Aggregate recommendation clicks by category
  INSERT INTO public.analytics_daily_aggregates (date, metric_type, metric_key, metric_value, metadata)
  SELECT 
    target_date,
    'recommendation_clicks',
    event_data->>'category' as metric_key,
    COUNT(*) as metric_value,
    jsonb_build_object('event_type', 'recommendation_click') as metadata
  FROM public.user_activity_events 
  WHERE DATE(created_at) = target_date 
    AND event_type = 'recommendation_click'
    AND event_data->>'category' IS NOT NULL
  GROUP BY event_data->>'category';
  
  -- Aggregate favorites by category
  INSERT INTO public.analytics_daily_aggregates (date, metric_type, metric_key, metric_value, metadata)
  SELECT 
    target_date,
    'favorites_added',
    event_data->>'category' as metric_key,
    COUNT(*) as metric_value,
    jsonb_build_object('event_type', 'favorite_added') as metadata
  FROM public.user_activity_events 
  WHERE DATE(created_at) = target_date 
    AND event_type = 'favorite_added'
    AND event_data->>'category' IS NOT NULL
  GROUP BY event_data->>'category';
  
  -- Aggregate user sessions
  INSERT INTO public.analytics_daily_aggregates (date, metric_type, metric_key, metric_value, metadata)
  SELECT 
    target_date,
    'daily_stats',
    'total_sessions',
    COUNT(*) as metric_value,
    jsonb_build_object('avg_duration', AVG(duration_seconds)) as metadata
  FROM public.user_sessions 
  WHERE DATE(started_at) = target_date;
  
  -- Aggregate unique users
  INSERT INTO public.analytics_daily_aggregates (date, metric_type, metric_key, metric_value, metadata)
  SELECT 
    target_date,
    'daily_stats',
    'unique_users',
    COUNT(DISTINCT user_id) as metric_value,
    '{}'::jsonb as metadata
  FROM public.user_activity_events 
  WHERE DATE(created_at) = target_date;
  
END;
$$;