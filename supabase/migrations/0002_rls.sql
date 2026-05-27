-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper: SECURITY DEFINER function to check role without recursion
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_alumni()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND approval_status = 'approved'
      AND is_active = true
      AND role IN ('alumni', 'admin', 'super_admin')
  );
$$;

-- ====== PROFILES ======
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self_select" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_self_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_directory_read" ON profiles
  FOR SELECT USING (
    public.is_approved_alumni()
    AND approval_status = 'approved'
    AND is_active = true
  );

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ====== ANNOUNCEMENTS ======
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_alumni_read" ON announcements
  FOR SELECT USING (is_published = true AND public.is_approved_alumni());

CREATE POLICY "announcements_admin_all" ON announcements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ====== EVENTS ======
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_alumni_read" ON events
  FOR SELECT USING (is_published = true AND public.is_approved_alumni());

CREATE POLICY "events_admin_all" ON events
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ====== EVENT RSVPS ======
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsvps_alumni_read_own" ON event_rsvps
  FOR SELECT USING (auth.uid() = alumni_id OR public.is_admin());

CREATE POLICY "rsvps_alumni_insert_own" ON event_rsvps
  FOR INSERT WITH CHECK (auth.uid() = alumni_id AND public.is_approved_alumni());

CREATE POLICY "rsvps_alumni_delete_own" ON event_rsvps
  FOR DELETE USING (auth.uid() = alumni_id);

CREATE POLICY "rsvps_admin_all" ON event_rsvps
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ====== FORUM ======
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_categories_alumni_read" ON forum_categories
  FOR SELECT USING (is_active = true AND public.is_approved_alumni());

CREATE POLICY "forum_categories_admin_all" ON forum_categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "forum_threads_alumni_read" ON forum_threads
  FOR SELECT USING (public.is_approved_alumni());

CREATE POLICY "forum_threads_alumni_create" ON forum_threads
  FOR INSERT WITH CHECK (auth.uid() = author_id AND public.is_approved_alumni());

CREATE POLICY "forum_threads_author_update" ON forum_threads
  FOR UPDATE USING (auth.uid() = author_id AND is_locked = false)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "forum_threads_admin_all" ON forum_threads
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "forum_replies_alumni_read" ON forum_replies
  FOR SELECT USING (public.is_approved_alumni());

CREATE POLICY "forum_replies_alumni_create" ON forum_replies
  FOR INSERT WITH CHECK (auth.uid() = author_id AND public.is_approved_alumni());

CREATE POLICY "forum_replies_author_update" ON forum_replies
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "forum_replies_admin_all" ON forum_replies
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ====== MEMBERSHIP PLANS ======
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON membership_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "plans_admin_all" ON membership_plans
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ====== PAYMENTS ======
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_self_read" ON payments
  FOR SELECT USING (auth.uid() = alumni_id);

CREATE POLICY "payments_admin_all" ON payments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- Note: payment INSERTs / status UPDATEs happen via service role from server actions / webhook only.

-- ====== AUDIT LOG ======
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_read" ON audit_log
  FOR SELECT USING (public.is_admin());
-- Inserts via service role only.

-- ====== SITE SETTINGS ======
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_public_read" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "settings_admin_all" ON site_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
