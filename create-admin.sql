-- Create Admin User
-- Username: xinreal
-- Password: zerocall

USE reallisting;

-- Generate MD5 ID for the user
SET @user_id = MD5(CONCAT('xinreal', NOW()));

-- Insert admin user (password will be hashed with SHA256)
-- The password hash is: SHA256('zerocall' + JWT_SECRET)
INSERT INTO users (id, mobile, password, name, role, is_active, created_at)
VALUES (
    @user_id,
    'xinreal',
    SHA2(CONCAT('zerocall', 'reallisting_secret_key_2025_secure'), 256),
    'Admin User',
    'admin',
    TRUE,
    NOW()
)
ON DUPLICATE KEY UPDATE 
    password = SHA2(CONCAT('zerocall', 'reallisting_secret_key_2025_secure'), 256),
    role = 'admin',
    is_active = TRUE;

SELECT 
    id, 
    mobile as username, 
    name, 
    role, 
    is_active, 
    created_at 
FROM users 
WHERE mobile = 'xinreal';

SELECT 'Admin user created successfully!' as status;
