-- Update existing favorites with clean business descriptions based on category
UPDATE user_recommendations 
SET business_description = CASE 
  WHEN category ILIKE '%grocery%' THEN 
    CASE 
      WHEN business_name ILIKE '%geissler%' THEN 'Family-owned grocery chain with great produce'
      WHEN business_features::text ILIKE '%organic%' THEN 'Fresh organic produce and natural foods'
      WHEN business_features::text ILIKE '%affordable%' THEN 'Affordable groceries for everyday needs'
      ELSE 'Your neighborhood grocery destination'
    END
  WHEN category ILIKE '%fitness%' THEN 'Stay active and healthy in your community'
  WHEN category ILIKE '%restaurant%' THEN 'Local dining favorite'
  WHEN category ILIKE '%faith%' THEN 'Welcoming spiritual community'
  WHEN category ILIKE '%green space%' THEN 'Perfect for outdoor activities and relaxation'
  ELSE 'Highly recommended local spot'
END
WHERE is_favorite = true 
AND (business_description LIKE '%_%' OR business_description ILIKE '%grocery_or_supermarket%' OR business_description ILIKE '%establishment%');