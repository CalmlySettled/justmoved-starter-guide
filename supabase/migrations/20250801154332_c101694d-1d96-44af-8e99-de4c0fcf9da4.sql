-- Enable leaked password protection for better security
-- This helps prevent users from using passwords that have been found in data breaches
UPDATE auth.config 
SET leaked_password_protection = true;