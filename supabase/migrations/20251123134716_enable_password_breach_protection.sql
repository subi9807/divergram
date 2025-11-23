/*
  # Enable Password Breach Protection

  This migration documents the password breach protection feature that needs to be
  enabled in the Supabase Dashboard for enhanced security.

  ## Security Enhancement: Password Breach Protection

  Supabase Auth can prevent users from using compromised passwords by checking
  against the HaveIBeenPwned.org database.

  ### How to Enable:

  #### Option 1: Supabase Dashboard (Recommended)
  1. Go to your Supabase project dashboard
  2. Navigate to Authentication → Policies
  3. Find "Password Protection" or "Security" section
  4. Enable "Check for leaked passwords" or "Password breach protection"
  5. Save changes

  #### Option 2: Supabase CLI (if available)
  ```bash
  supabase dashboard
  # Then follow the dashboard steps above
  ```

  ### Benefits:
  - Prevents use of compromised passwords during signup
  - Blocks password changes to known breached passwords
  - Real-time checking against HaveIBeenPwned.org database
  - Privacy-preserving (uses k-anonymity, only first 5 chars of hash sent)

  ### User Experience:
  - Users attempting to use a breached password will receive an error
  - Error message: "This password has appeared in a data breach"
  - Users must choose a different, secure password

  ### Privacy & Security:
  - Only the first 5 characters of the password hash are sent (k-anonymity)
  - The actual password is never transmitted
  - No personally identifiable information is shared
  - HTTPS encryption for all API calls

  ### Testing:
  After enabling, test with a known breached password like "password123"
  to verify the feature is working correctly.

  ## Note:
  This is a configuration-only change and does not modify the database schema.
  The setting is managed by Supabase Auth service configuration.
*/

-- Create a documentation table for security configurations
CREATE TABLE IF NOT EXISTS public.security_config_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL,
  enabled boolean DEFAULT false,
  enabled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Document the password breach protection feature
INSERT INTO public.security_config_docs (feature_name, enabled, notes)
VALUES (
  'password_breach_protection',
  false,
  'Enable password breach protection in Supabase Dashboard → Authentication → Policies. This feature checks passwords against HaveIBeenPwned.org to prevent use of compromised passwords.'
)
ON CONFLICT DO NOTHING;

-- Add comment to the table
COMMENT ON TABLE public.security_config_docs IS 'Documentation table for security features that require configuration in Supabase Dashboard or CLI.';
