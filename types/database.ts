export type { Json } from '@/lib/supabase/database.types';

export type UserRole = 'guest' | 'pending' | 'alumni' | 'admin' | 'super_admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type MembershipType = 'lifetime' | 'annual';

export interface Profile {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  batch_year: number;
  course: string;
  roll_number: string | null;
  email: string;
  phone: string | null;
  alternate_phone: string | null;
  current_city: string | null;
  current_state: string | null;
  current_country: string | null;
  pincode: string | null;
  occupation: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  bio: string | null;
  achievements: string | null;
  hide_email: boolean;
  hide_phone: boolean;
  role: UserRole;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  membership_type: MembershipType | null;
  membership_expires_at: string | null;
  is_paid_member: boolean;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  is_active: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_image_url: string | null;
  author_id: string;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  banner_image_url: string | null;
  event_type: string;
  venue: string | null;
  online_link: string | null;
  starts_at: string;
  ends_at: string | null;
  registration_deadline: string | null;
  max_attendees: number | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  membership_type: MembershipType;
  duration_months: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  alumni_id: string;
  plan_id: string | null;
  txnid: string;
  easebuzz_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_mode: string | null;
  bank_ref_num: string | null;
  gateway_response: Record<string, unknown> | null;
  receipt_url: string | null;
  receipt_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// Minimal Database typing wrapper (regenerate from Supabase CLI for full coverage)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, 'id' | 'full_name' | 'batch_year' | 'course' | 'email'>; Update: Partial<Profile> };
      announcements: { Row: Announcement; Insert: Partial<Announcement> & Pick<Announcement, 'title' | 'slug' | 'content' | 'author_id'>; Update: Partial<Announcement> };
      events: { Row: Event; Insert: Partial<Event> & Pick<Event, 'title' | 'slug' | 'starts_at' | 'created_by'>; Update: Partial<Event> };
      event_rsvps: { Row: { id: string; event_id: string; alumni_id: string; registered_at: string }; Insert: { event_id: string; alumni_id: string }; Update: never };
      forum_categories: { Row: { id: string; name: string; description: string | null; slug: string; display_order: number; is_active: boolean; created_by: string | null; created_at: string }; Insert: Partial<{ id: string; name: string; description: string | null; slug: string; display_order: number; is_active: boolean; created_by: string | null }>; Update: Partial<{ name: string; description: string | null; slug: string; display_order: number; is_active: boolean }> };
      forum_threads: { Row: { id: string; category_id: string; author_id: string; title: string; content: string; is_pinned: boolean; is_locked: boolean; reply_count: number; last_reply_at: string | null; created_at: string; updated_at: string }; Insert: { category_id: string; author_id: string; title: string; content: string }; Update: Partial<{ title: string; content: string; is_pinned: boolean; is_locked: boolean }> };
      forum_replies: { Row: { id: string; thread_id: string; author_id: string; content: string; is_deleted: boolean; created_at: string; updated_at: string }; Insert: { thread_id: string; author_id: string; content: string }; Update: Partial<{ content: string; is_deleted: boolean }> };
      membership_plans: { Row: MembershipPlan; Insert: Partial<MembershipPlan> & Pick<MembershipPlan, 'name' | 'amount' | 'membership_type'>; Update: Partial<MembershipPlan> };
      payments: { Row: Payment; Insert: Partial<Payment> & Pick<Payment, 'alumni_id' | 'txnid' | 'amount'>; Update: Partial<Payment> };
      audit_log: { Row: { id: string; actor_id: string | null; action: string; target_type: string | null; target_id: string | null; metadata: Record<string, unknown> | null; created_at: string }; Insert: { actor_id?: string | null; action: string; target_type?: string | null; target_id?: string | null; metadata?: Record<string, unknown> | null }; Update: never };
      site_settings: { Row: { key: string; value: unknown; updated_by: string | null; updated_at: string }; Insert: { key: string; value: unknown; updated_by?: string | null }; Update: Partial<{ value: unknown; updated_by: string | null }> };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_approved_alumni: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      approval_status: ApprovalStatus;
      payment_status: PaymentStatus;
      membership_type: MembershipType;
    };
  };
}
