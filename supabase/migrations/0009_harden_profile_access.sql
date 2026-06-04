-- Harden profile writes and replace the public profile-row policy with a count-only RPC.

-- Registration creates profiles through the service-role client. Authenticated users
-- must never be able to insert a profile row with self-selected privileged fields.
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;

-- Keep database authorization aligned with the application: an admin role alone is
-- not enough when the account is unapproved or inactive.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND approval_status = 'approved'
      AND is_active = true
  );
$$;

-- RLS controls which rows may be updated, but it cannot restrict which columns are
-- changed. Reject privileged-field changes unless the caller was already an admin
-- or is a trusted server/database role.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin')
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.membership_type IS DISTINCT FROM OLD.membership_type
     OR NEW.membership_expires_at IS DISTINCT FROM OLD.membership_expires_at
     OR NEW.is_paid_member IS DISTINCT FROM OLD.is_paid_member
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Profile privilege fields may only be changed by an administrator'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

REVOKE ALL ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC;

-- A SELECT policy always exposes qualifying rows, even when the application only
-- requests a count. Remove that policy and expose only the aggregate.
DROP POLICY IF EXISTS "profiles_public_count" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_public_alumni_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)
  FROM public.profiles
  WHERE approval_status = 'approved'
    AND is_active = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_alumni_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_alumni_count() TO anon, authenticated, service_role;
