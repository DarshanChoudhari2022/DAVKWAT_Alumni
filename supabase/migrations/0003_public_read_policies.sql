-- ============================================================
-- Allow anon/public READ access to published content for the landing page.
-- The landing page uses createStaticClient (anon key, no session)
-- so it needs to read published events, announcements, and alumni count.
-- ============================================================

-- Published events are visible to everyone (landing page)
CREATE POLICY "events_public_read_published" ON events
  FOR SELECT USING (is_published = true);

-- Published announcements are visible to everyone (landing page)
CREATE POLICY "announcements_public_read_published" ON announcements
  FOR SELECT USING (is_published = true);

-- Allow public to read basic profile count for stats
-- (the static client only does count queries with head:true)
CREATE POLICY "profiles_public_count" ON profiles
  FOR SELECT USING (
    approval_status = 'approved'
    AND is_active = true
  );
