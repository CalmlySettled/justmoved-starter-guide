-- Update the aggregate_daily_analytics function to include UI interaction category tracking
CREATE OR REPLACE FUNCTION public.aggregate_daily_analytics(target_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- NEW: Aggregate explore category clicks
  INSERT INTO public.analytics_daily_aggregates (date, metric_type, metric_key, metric_value, metadata)
  SELECT 
    target_date,
    'explore_category_clicks',
    CONCAT('Explore: ', event_data->>'category') as metric_key,
    COUNT(*) as metric_value,
    jsonb_build_object(
      'event_type', 'ui_interaction',
      'element', 'explore_category',
      'action', 'clicked'
    ) as metadata
  FROM public.user_activity_events 
  WHERE DATE(created_at) = target_date 
    AND event_type = 'ui_interaction'
    AND event_data->>'element' = 'explore_category'
    AND event_data->>'action' = 'clicked'
    AND event_data->>'category' IS NOT NULL
  GROUP BY event_data->>'category';

  -- NEW: Aggregate popular category clicks
  INSERT INTO public.analytics_daily_aggregates (date, metric_type, metric_key, metric_value, metadata)
  SELECT 
    target_date,
    'popular_category_clicks',
    CONCAT('Popular: ', event_data->>'category') as metric_key,
    COUNT(*) as metric_value,
    jsonb_build_object(
      'event_type', 'ui_interaction',
      'element', 'popular_category',
      'action', 'clicked'
    ) as metadata
  FROM public.user_activity_events 
  WHERE DATE(created_at) = target_date 
    AND event_type = 'ui_interaction'
    AND event_data->>'element' = 'popular_category'
    AND event_data->>'action' = 'clicked'
    AND event_data->>'category' IS NOT NULL
  GROUP BY event_data->>'category';

  -- NEW: Aggregate themed pack clicks
  INSERT INTO public.analytics_daily_aggregates (date, metric_type, metric_key, metric_value, metadata)
  SELECT 
    target_date,
    'themed_pack_clicks',
    CONCAT('Themed Pack: ', event_data->>'packTitle') as metric_key,
    COUNT(*) as metric_value,
    jsonb_build_object(
      'event_type', 'ui_interaction',
      'element', 'explore_themed_pack',
      'action', 'clicked',
      'pack_title', event_data->>'packTitle'
    ) as metadata
  FROM public.user_activity_events 
  WHERE DATE(created_at) = target_date 
    AND event_type = 'ui_interaction'
    AND event_data->>'element' = 'explore_themed_pack'
    AND event_data->>'action' = 'clicked'
    AND event_data->>'packTitle' IS NOT NULL
  GROUP BY event_data->>'packTitle';
  
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
$function$;