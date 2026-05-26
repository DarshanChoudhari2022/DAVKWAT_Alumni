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

export const changeRoleSchema = z.object({
  alumniId: z.string().uuid(),
  role: z.enum(['pending', 'alumni', 'admin', 'super_admin']),
});

export const toggleActiveSchema = z.object({
  alumniId: z.string().uuid(),
  is_active: z.boolean(),
});
