-- Create spatial index for faster distance queries on user_recommendations
CREATE INDEX IF NOT EXISTS idx_user_recommendations_location 
ON user_recommendations USING btree (business_latitude, business_longitude);

-- Create index for distance-based filtering
CREATE INDEX IF NOT EXISTS idx_user_recommendations_distance 
ON user_recommendations USING btree (user_id, distance_miles);

-- Create composite index for location + user queries
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_location 
ON user_recommendations USING btree (user_id, business_latitude, business_longitude, distance_miles);