-- ============================================================
-- DAVKAWT Alumni Portal — Initial Schema
-- ============================================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('guest', 'pending', 'alumni', 'admin', 'super_admin');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE membership_type AS ENUM ('lifetime', 'annual');

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,

  batch_year INTEGER NOT NULL,
  course TEXT NOT NULL,
  roll_number TEXT,

  email TEXT NOT NULL,
  phone TEXT,
  alternate_phone TEXT,

  current_city TEXT,
  current_state TEXT,
  current_country TEXT DEFAULT 'India',
  pincode TEXT,

  occupation TEXT,
  company TEXT,
  job_title TEXT,
  industry TEXT,
  linkedin_url TEXT,
  website_url TEXT,

  bio TEXT,
  achievements TEXT,

  hide_email BOOLEAN DEFAULT false,
  hide_phone BOOLEAN DEFAULT false,

  role user_role DEFAULT 'pending',
  approval_status approval_status DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,

  membership_type membership_type,
  membership_expires_at DATE,
  is_paid_member BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- ANNOUNCEMENTS
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID NOT NULL REFERENCES profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  banner_image_url TEXT,
  event_type TEXT DEFAULT 'in_person',
  venue TEXT,
  online_link TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  max_attendees INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, alumni_id)
);

-- FORUM
CREATE TABLE forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  membership_type membership_type NOT NULL,
  duration_months INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id UUID NOT NULL REFERENCES profiles(id),
  plan_id UUID REFERENCES membership_plans(id),

  txnid TEXT UNIQUE NOT NULL,
  easebuzz_payment_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status payment_status DEFAULT 'pending',

  payment_mode TEXT,
  bank_ref_num TEXT,
  gateway_response JSONB,

  receipt_url TEXT,
  receipt_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOG
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SITE SETTINGS
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_approval_status ON profiles(approval_status);
CREATE INDEX idx_profiles_batch_year ON profiles(batch_year);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_payments_alumni_id ON payments(alumni_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_forum_threads_category_id ON forum_threads(category_id);
CREATE INDEX idx_forum_replies_thread_id ON forum_replies(thread_id);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX idx_announcements_published ON announcements(is_published, published_at DESC);
CREATE INDEX idx_events_starts_at ON events(starts_at);

CREATE INDEX idx_profiles_fts ON profiles USING GIN(
  to_tsvector('english',
    coalesce(full_name, '') || ' ' ||
    coalesce(company, '') || ' ' ||
    coalesce(occupation, '') || ' ' ||
    coalesce(job_title, '') || ' ' ||
    coalesce(current_city, '') || ' ' ||
    coalesce(batch_year::text, '')
  )
);

-- TRIGGERS: auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_forum_threads_updated_at BEFORE UPDATE ON forum_threads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_forum_replies_updated_at BEFORE UPDATE ON forum_replies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TRIGGER: forum thread reply count + last_reply_at
CREATE OR REPLACE FUNCTION update_thread_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forum_replies_count
AFTER INSERT OR DELETE ON forum_replies
FOR EACH ROW EXECUTE FUNCTION update_thread_on_reply();
