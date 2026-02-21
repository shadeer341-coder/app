-- Enable Row Level Security on the purchases table
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Create a policy that denies all access to the table.
-- Server-side operations using the service_role key will bypass this policy.
CREATE POLICY "Deny all access to public"
ON public.purchases
FOR ALL
USING (false)
WITH CHECK (false);

-- Optional: If you ever need to allow users to see their OWN purchases,
-- you could create a policy like this instead. For now, we are keeping it fully locked down.
--
-- CREATE POLICY "Users can view their own purchases"
-- ON public.purchases
-- FOR SELECT
-- USING (auth.uid() = user_id);
