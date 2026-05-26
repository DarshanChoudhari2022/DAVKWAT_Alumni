/**
 * Database types — mirrors `supabase/migrations/0001_init.sql`.
 * If you change the schema, update this file in lockstep.
 *
 * To regenerate from the live DB instead:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
          role: 'guest' | 'pending' | 'alumni' | 'admin' | 'super_admin';
          approval_status: 'pending' | 'approved' | 'rejected';
          approved_at: string | null;
          approved_by: string | null;
          rejection_reason: string | null;
          membership_type: 'lifetime' | 'annual' | null;
          membership_expires_at: string | null;
          is_paid_member: boolean;
          created_at: string;
          updated_at: string;
          last_seen_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id: string;
          full_name: string;
          display_name?: string | null;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          batch_year: number;
          course: string;
          roll_number?: string | null;
          email: string;
          phone?: string | null;
          alternate_phone?: string | null;
          current_city?: string | null;
          current_state?: string | null;
          current_country?: string | null;
          pincode?: string | null;
          occupation?: string | null;
          company?: string | null;
          job_title?: string | null;
          industry?: string | null;
          linkedin_url?: string | null;
          website_url?: string | null;
          bio?: string | null;
          achievements?: string | null;
          hide_email?: boolean;
          hide_phone?: boolean;
          role?: 'guest' | 'pending' | 'alumni' | 'admin' | 'super_admin';
          approval_status?: 'pending' | 'approved' | 'rejected';
          approved_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
          membership_type?: 'lifetime' | 'annual' | null;
          membership_expires_at?: string | null;
          is_paid_member?: boolean;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string | null;
          is_active?: boolean;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };

      announcements: {
        Row: {
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
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          content: string;
          cover_image_url?: string | null;
          author_id: string;
          is_pinned?: boolean;
          is_published?: boolean;
          published_at?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: 'announcements_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      events: {
        Row: {
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
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          banner_image_url?: string | null;
          event_type?: string;
          venue?: string | null;
          online_link?: string | null;
          starts_at: string;
          ends_at?: string | null;
          registration_deadline?: string | null;
          max_attendees?: number | null;
          is_published?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };

      event_rsvps: {
        Row: {
          id: string;
          event_id: string;
          alumni_id: string;
          registered_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          alumni_id: string;
          registered_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: 'event_rsvps_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_rsvps_alumni_id_fkey';
            columns: ['alumni_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      forum_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          slug: string;
          display_order: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          slug: string;
          display_order?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };

      forum_threads: {
        Row: {
          id: string;
          category_id: string;
          author_id: string;
          title: string;
          content: string;
          is_pinned: boolean;
          is_locked: boolean;
          reply_count: number;
          last_reply_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          author_id: string;
          title: string;
          content: string;
          is_pinned?: boolean;
          is_locked?: boolean;
          reply_count?: number;
          last_reply_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: 'forum_threads_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'forum_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forum_threads_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      forum_replies: {
        Row: {
          id: string;
          thread_id: string;
          author_id: string;
          content: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          author_id: string;
          content: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };

      membership_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          amount: number;
          currency: string;
          membership_type: 'lifetime' | 'annual';
          duration_months: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          amount: number;
          currency?: string;
          membership_type: 'lifetime' | 'annual';
          duration_months?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };

      payments: {
        Row: {
          id: string;
          alumni_id: string;
          plan_id: string | null;
          txnid: string;
          easebuzz_payment_id: string | null;
          amount: number;
          currency: string;
          status: 'pending' | 'success' | 'failed' | 'refunded';
          payment_mode: string | null;
          bank_ref_num: string | null;
          gateway_response: Json | null;
          receipt_url: string | null;
          receipt_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          alumni_id: string;
          plan_id?: string | null;
          txnid: string;
          easebuzz_payment_id?: string | null;
          amount: number;
          currency?: string;
          status?: 'pending' | 'success' | 'failed' | 'refunded';
          payment_mode?: string | null;
          bank_ref_num?: string | null;
          gateway_response?: Json | null;
          receipt_url?: string | null;
          receipt_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: 'payments_alumni_id_fkey';
            columns: ['alumni_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'membership_plans';
            referencedColumns: ['id'];
          }
        ];
      };

      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };

      site_settings: {
        Row: {
          key: string;
          value: Json | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_approved_alumni: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: 'guest' | 'pending' | 'alumni' | 'admin' | 'super_admin';
      approval_status: 'pending' | 'approved' | 'rejected';
      payment_status: 'pending' | 'success' | 'failed' | 'refunded';
      membership_type: 'lifetime' | 'annual';
    };
  };
}
