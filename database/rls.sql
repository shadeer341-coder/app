-- This script enables Row Level Security (RLS) on the password_reset_tokens table
-- and sets a restrictive policy. This is a security best practice.
--
-- How to use:
-- 1. Navigate to your Supabase project's dashboard.
-- 2. Go to the "SQL Editor".
-- 3. Click "New query".
-- 4. Copy and paste the content of this file into the editor.
-- 5. Click "Run".

-- Step 1: Enable Row Level Security on the table.
-- This ensures that access to rows is governed by security policies.
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a restrictive policy.
-- This policy denies all (SELECT, INSERT, UPDATE, DELETE) operations for any user
-- trying to access the table directly. This is secure because our application's
-- backend functions use the service_role key, which bypasses RLS.
CREATE POLICY "Deny all user access to password reset tokens"
ON public.password_reset_tokens
FOR ALL
USING (false)
WITH CHECK (false);

-- Inform the user that the script has been successfully applied.
SELECT 'RLS enabled and policy created for public.password_reset_tokens';
