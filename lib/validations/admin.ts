import { z } from 'zod';

export const membershipPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  description: z.string().max(500).optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  membership_type: z.enum(['lifetime', 'annual']),
  duration_months: z.coerce.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;

export const siteSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const siteSettingsValuesSchema = z.object({
  trust_name: z.string().min(2, 'Trust name is required').max(160),
  contact_email: z.string().email('Enter a valid contact email'),
  contact_phone: z.string().max(30).optional().or(z.literal('')),
  about_short: z.string().min(20, 'Add a short trust description').max(400),
  social_links: z.object({
    facebook: z.string().url('Enter a valid Facebook URL').optional().or(z.literal('')),
    twitter: z.string().url('Enter a valid Twitter/X URL').optional().or(z.literal('')),
    linkedin: z.string().url('Enter a valid LinkedIn URL').optional().or(z.literal('')),
    instagram: z.string().url('Enter a valid Instagram URL').optional().or(z.literal('')),
  }),
});

export const changeRoleSchema = z.object({
  alumniId: z.string().uuid(),
  role: z.enum(['pending', 'alumni', 'admin', 'super_admin']),
});

export const toggleActiveSchema = z.object({
  alumniId: z.string().uuid(),
  is_active: z.boolean(),
});

export const adminProfileUpdateSchema = z.object({
  full_name: z.string().min(2).max(120).optional(),
  email: z.string().email().max(254).optional(),
  display_name: z.string().max(120).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  alternate_phone: z.string().max(20).optional().nullable(),
  current_city: z.string().max(80).optional().nullable(),
  current_state: z.string().max(80).optional().nullable(),
  current_country: z.string().max(80).optional().nullable(),
  occupation: z.string().max(120).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  job_title: z.string().max(120).optional().nullable(),
  industry: z.string().max(80).optional().nullable(),
  linkedin_url: z.string().url().optional().nullable().or(z.literal('')),
  website_url: z.string().url().optional().nullable().or(z.literal('')),
  bio: z.string().max(500).optional().nullable(),
  achievements: z.string().max(1000).optional().nullable(),
  hide_email: z.boolean().optional(),
  hide_phone: z.boolean().optional(),
});
