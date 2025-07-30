-- Clean up duplicate user recommendations
-- Keep only the most recent record for each unique combination of user_id, business_name, business_address, and category

DELETE FROM user_recommendations 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, business_name, business_address, category) id
  FROM user_recommendations 
  ORDER BY user_id, business_name, business_address, category, created_at DESC
);