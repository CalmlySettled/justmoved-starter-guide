-- Create a unique constraint to prevent future duplicates
-- This will ensure that each user can only have one recommendation per business name/address/category combination
CREATE UNIQUE INDEX idx_user_recommendations_unique_business 
ON user_recommendations (user_id, business_name, business_address, category);