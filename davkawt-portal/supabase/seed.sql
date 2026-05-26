-- Default forum categories
INSERT INTO forum_categories (name, description, slug, display_order) VALUES
  ('General Discussion', 'Open conversations among DAVKAWT alumni', 'general', 1),
  ('Career & Networking', 'Job openings, referrals, mentorship', 'career', 2),
  ('Reunions & Meetups', 'Plan and discuss alumni gatherings', 'reunions', 3),
  ('Memories & Nostalgia', 'Share stories and photos from your time at DAV Khagaul', 'memories', 4),
  ('Help & Support', 'Questions about the portal or membership', 'support', 5)
ON CONFLICT (slug) DO NOTHING;

-- Default membership plans (amounts to be confirmed by Trust)
INSERT INTO membership_plans (name, description, amount, membership_type, duration_months) VALUES
  ('Lifetime Membership', 'One-time payment for permanent alumni status and benefits', 5000.00, 'lifetime', NULL),
  ('Annual Membership', 'Yearly membership with full portal access', 500.00, 'annual', 12)
ON CONFLICT DO NOTHING;

-- Default site settings
INSERT INTO site_settings (key, value) VALUES
  ('trust_name', '"DAV Khagaul Alumni Welfare Trust"'::jsonb),
  ('contact_email', '"contact@davkawt.org"'::jsonb),
  ('contact_phone', '""'::jsonb),
  ('social_links', '{"facebook":"","twitter":"","linkedin":"","instagram":""}'::jsonb),
  ('about_short', '"DAV Khagaul Alumni Welfare Trust connects generations of alumni from DAV Khagaul, Bihar — fostering community, mentorship, and lasting friendships."'::jsonb)
ON CONFLICT (key) DO NOTHING;
