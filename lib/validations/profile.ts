import { z } from 'zod';
import {
  optionalDateOfBirth,
  optionalIndianMobile,
  optionalProfileUrl,
  optionalText,
  requiredName,
} from './common';
import { VALIDATION_LIMITS } from './constraints';

export const profileUpdateSchema = z.object({
  full_name: requiredName,
  batch_year: z.number().int().min(VALIDATION_LIMITS.minBatchYear).max(VALIDATION_LIMITS.maxBatchYear),
  course: z.enum(['Science', 'Commerce', 'Arts', 'Other']),
  roll_number: optionalText(VALIDATION_LIMITS.rollNumberMax),

  phone: optionalIndianMobile,
  current_city: optionalText(VALIDATION_LIMITS.placeMax),
  current_state: optionalText(VALIDATION_LIMITS.placeMax),
  current_country: optionalText(VALIDATION_LIMITS.placeMax),
  date_of_birth: optionalDateOfBirth,
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().or(z.literal('')),

  occupation: optionalText(VALIDATION_LIMITS.professionalTextMax),
  company: optionalText(VALIDATION_LIMITS.professionalTextMax),
  job_title: optionalText(VALIDATION_LIMITS.professionalTextMax),
  industry: optionalText(VALIDATION_LIMITS.industryMax),
  linkedin_url: optionalProfileUrl,
  bio: optionalText(VALIDATION_LIMITS.bioMax),

  hide_email: z.boolean().default(false),
  hide_phone: z.boolean().default(false),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
