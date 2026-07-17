-- Speed up admin approval queues and proof-of-payment lookups used on every review.
CREATE INDEX IF NOT EXISTS idx_profiles_approval_type_created_id
  ON profiles (approval_status, profile_type, created_at, id);

CREATE INDEX IF NOT EXISTS idx_payments_alumni_receipt_created
  ON payments (alumni_id, created_at DESC)
  WHERE receipt_url IS NOT NULL;

-- Speed up member profile completion checks and protected member layout reads.
CREATE INDEX IF NOT EXISTS idx_profiles_id_completion_fields
  ON profiles (id)
  INCLUDE (avatar_url, phone, current_city, current_state, school_document_url);
