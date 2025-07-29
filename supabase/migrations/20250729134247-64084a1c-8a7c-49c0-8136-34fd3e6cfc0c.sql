-- First, let's create a function to remove duplicates from the user_recommendations table
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

-- Create a unique constraint to prevent future duplicates
-- This will ensure that each user can only have one recommendation per business name/address/category combination
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_user_recommendations_unique_business 
ON user_recommendations (user_id, business_name, business_address, category);