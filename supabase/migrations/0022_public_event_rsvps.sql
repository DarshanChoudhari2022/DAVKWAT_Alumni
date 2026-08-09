-- Public/guest RSVP support and optional event links on announcements.

ALTER TABLE event_rsvps
  ALTER COLUMN alumni_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_batch_year INTEGER,
  ADD COLUMN IF NOT EXISTS guest_city TEXT;

ALTER TABLE event_rsvps
  DROP CONSTRAINT IF EXISTS event_rsvps_identity_check;
ALTER TABLE event_rsvps
  ADD CONSTRAINT event_rsvps_identity_check CHECK (
    alumni_id IS NOT NULL
    OR (guest_name IS NOT NULL AND guest_email IS NOT NULL AND guest_phone IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_guest_rsvp_email
  ON event_rsvps (event_id, lower(guest_email))
  WHERE alumni_id IS NULL;

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS rsvp_event_id UUID REFERENCES events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_rsvp_event_id
  ON announcements (rsvp_event_id)
  WHERE rsvp_event_id IS NOT NULL;

-- Connect the existing meeting-minutes announcement to the upcoming alumni meet.
UPDATE announcements a
SET rsvp_event_id = e.id,
    updated_at = NOW()
FROM events e
WHERE lower(a.title) = 'core committee'
  AND lower(e.title) = 'alumni meet'
  AND e.is_published = TRUE
  AND e.starts_at > NOW()
  AND a.rsvp_event_id IS NULL;

CREATE OR REPLACE FUNCTION public.submit_guest_rsvp(
  p_event_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_batch_year INTEGER DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_existing_id UUID;
  v_rsvp_id UUID;
  v_count BIGINT;
BEGIN
  p_name := trim(p_name);
  p_email := lower(trim(p_email));
  p_phone := trim(p_phone);
  p_city := NULLIF(trim(p_city), '');

  IF length(p_name) < 2 OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'Enter a valid name' USING ERRCODE = '22023';
  END IF;
  IF p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' OR length(p_email) > 254 THEN
    RAISE EXCEPTION 'Enter a valid email' USING ERRCODE = '22023';
  END IF;
  IF length(p_phone) < 8 OR length(p_phone) > 20 THEN
    RAISE EXCEPTION 'Enter a valid phone number' USING ERRCODE = '22023';
  END IF;
  IF p_batch_year IS NOT NULL AND (p_batch_year < 1950 OR p_batch_year > 2100) THEN
    RAISE EXCEPTION 'Enter a valid batch year' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id AND is_published = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_event.starts_at <= NOW()
     OR (v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline <= NOW()) THEN
    RAISE EXCEPTION 'RSVPs are closed for this event' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_existing_id
  FROM event_rsvps
  WHERE event_id = p_event_id
    AND alumni_id IS NULL
    AND lower(guest_email) = p_email;

  IF v_existing_id IS NOT NULL THEN
    UPDATE event_rsvps
    SET guest_name = p_name,
        guest_phone = p_phone,
        guest_batch_year = p_batch_year,
        guest_city = p_city
    WHERE id = v_existing_id;
    RETURN jsonb_build_object('rsvp_id', v_existing_id, 'already_registered', TRUE);
  END IF;

  IF v_event.max_attendees IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM event_rsvps WHERE event_id = p_event_id;
    IF v_count >= v_event.max_attendees THEN
      RAISE EXCEPTION 'This event is full' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO event_rsvps (
    event_id, alumni_id, guest_name, guest_email, guest_phone, guest_batch_year, guest_city
  ) VALUES (
    p_event_id, NULL, p_name, p_email, p_phone, p_batch_year, p_city
  )
  RETURNING id INTO v_rsvp_id;

  RETURN jsonb_build_object('rsvp_id', v_rsvp_id, 'already_registered', FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_rsvp(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_rsvp(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT)
  TO anon, authenticated, service_role;
