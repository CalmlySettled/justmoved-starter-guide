-- Delete duplicate recommendations, keeping only the most recent one for each unique business per user per category
DELETE FROM user_recommendations 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY user_id, business_name, business_address, category 
             ORDER BY created_at DESC
           ) as rn
    FROM user_recommendations
  ) ranked
  WHERE rn > 1
);