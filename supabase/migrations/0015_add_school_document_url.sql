-- Add school_document_url column to profiles table.
-- This column stores the URL of the proof-of-identity document uploaded
-- by faculty applicants during registration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_document_url text;
