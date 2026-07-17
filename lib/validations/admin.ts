import { z } from 'zod';
import {
  nullableInternationalPhone,
  optionalProfileUrl,
  optionalText,
  requiredName,
} from './common';
import { VALIDATION_LIMITS } from './constraints';

export const membershipPlanSchema = z.object({
  name: optionalText(VALIDATION_LIMITS.planNameMax).pipe(z.string().min(1, 'Plan name is required')),
  description: optionalText(VALIDATION_LIMITS.planDescriptionMax),
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
  trust_name: requiredName.pipe(z.string().max(VALIDATION_LIMITS.trustNameMax)),
  contact_email: z.string().trim().toLowerCase().email('Enter a valid contact email'),
  contact_phone: optionalText(VALIDATION_LIMITS.contactPhoneMax),
  about_short: optionalText(VALIDATION_LIMITS.aboutShortMax).pipe(
    z.string().min(20, 'Add a short trust description')
  ),
  social_links: z.object({
    facebook: optionalProfileUrl,
    twitter: optionalProfileUrl,
    linkedin: optionalProfileUrl,
    instagram: optionalProfileUrl,
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
  full_name: requiredName.optional(),
  email: z.string().trim().toLowerCase().email().max(VALIDATION_LIMITS.emailMax).optional(),
  display_name: optionalText(VALIDATION_LIMITS.displayNameMax).nullable(),
  phone: nullableInternationalPhone,
  alternate_phone: nullableInternationalPhone,
  current_city: optionalText(VALIDATION_LIMITS.placeMax).nullable(),
  current_state: optionalText(VALIDATION_LIMITS.placeMax).nullable(),
  current_country: optionalText(VALIDATION_LIMITS.placeMax).nullable(),
  occupation: optionalText(VALIDATION_LIMITS.professionalTextMax).nullable(),
  company: optionalText(VALIDATION_LIMITS.professionalTextMax).nullable(),
  job_title: optionalText(VALIDATION_LIMITS.professionalTextMax).nullable(),
  industry: optionalText(VALIDATION_LIMITS.industryMax).nullable(),
  linkedin_url: optionalProfileUrl,
  website_url: optionalProfileUrl,
  bio: optionalText(VALIDATION_LIMITS.bioMax).nullable(),
  achievements: optionalText(VALIDATION_LIMITS.achievementsMax).nullable(),
  hide_email: z.boolean().optional(),
  hide_phone: z.boolean().optional(),
});

export const deleteAlumniSchema = z.object({
  adminPassword: z.string().min(1, 'Admin password is required.'),
  confirmationText: z.literal('Delete', {
    errorMap: () => ({ message: 'Type Delete to confirm permanent deletion.' }),
  }),
});

export const manualPaymentStatusSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(['pending', 'success', 'failed']),
});
