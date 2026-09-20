-- =============================================================================
-- Digital Banking System — seed admin user
--
-- Creates a login you can use immediately once the stack is up:
--   email:    admin@example.com
--   password: password123
--
-- The password is stored as a bcrypt hash (never plaintext), generated with
-- the same algorithm account-service verifies against at login
-- (Spring Security's BCryptPasswordEncoder, strength 10).
--
-- Change this password (or remove this user) before using this anywhere
-- other than local development.
-- =============================================================================

USE account_db;

INSERT INTO users (id, email, full_name, password_hash, role, created_at)
SELECT
    UUID(),
    'admin@example.com',
    'Admin User',
    '$2b$10$tT22QXnsDRhjjA8L4JqVb.it3yHPhitqyTgcrktTfx.5ejRCsnizu',
    'ADMIN',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@example.com'
);
