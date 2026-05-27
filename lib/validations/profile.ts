import { z } from 'zod';

const CURRENT_YEAR = new Date().getFullYear();

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(120),
  batch_year: z.number().int().min(1950).max(CURRENT_YEAR),
  course: z.enum(['Science', 'Commerce', 'Arts', 'Other']),
  roll_number: z.string().max(40).optional().or(z.literal('')),

  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number').optional().or(z.literal('')),
  current_city: z.string().max(80).optional().or(z.literal('')),
  current_state: z.string().max(80).optional().or(z.literal('')),
  current_country: z.string().max(80).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().or(z.literal('')),

  occupation: z.string().max(120).optional().or(z.literal('')),
  company: z.string().max(120).optional().or(z.literal('')),
  job_title: z.string().max(120).optional().or(z.literal('')),
  industry: z.string().max(80).optional().or(z.literal('')),
  linkedin_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),

  hide_email: z.boolean().default(false),
  hide_phone: z.boolean().default(false),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
