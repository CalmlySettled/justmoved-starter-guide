-- Clean up test user accounts to start fresh
DELETE FROM auth.users WHERE email IN ('nicolas.ertz@temple.edu', 'nicolasertz1@gmail.com');