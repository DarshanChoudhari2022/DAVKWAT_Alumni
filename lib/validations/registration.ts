import { z } from 'zod';
import {
  optionalDateOfBirth,
  optionalIndianMobile,
  optionalProfileUrl,
  optionalText,
  requiredName,
} from './common';
import { VALIDATION_LIMITS } from './constraints';

export const accountSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email').max(VALIDATION_LIMITS.emailMax),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .max(VALIDATION_LIMITS.passwordMax)
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const academicSchema = z.object({
  full_name: requiredName,
  batch_year: z
    .number({ invalid_type_error: 'Required' })
    .int()
    .min(VALIDATION_LIMITS.minBatchYear, 'Too early')
    .max(VALIDATION_LIMITS.maxBatchYear, 'In the future'),
  course: z.enum(['Science', 'Commerce', 'Arts', 'Other'], {
    errorMap: () => ({ message: 'Select a course' }),
  }),
  roll_number: optionalText(VALIDATION_LIMITS.rollNumberMax),
});

export const personalSchema = z.object({
  phone: optionalIndianMobile,
  current_city: optionalText(VALIDATION_LIMITS.placeMax),
  current_state: optionalText(VALIDATION_LIMITS.placeMax),
  current_country: optionalText(VALIDATION_LIMITS.placeMax).default('India'),
  date_of_birth: optionalDateOfBirth,
  gender: z.enum(['male', 'female', 'other']).optional(),
});

export const professionalSchema = z.object({
  occupation: optionalText(VALIDATION_LIMITS.professionalTextMax),
  company: optionalText(VALIDATION_LIMITS.professionalTextMax),
  job_title: optionalText(VALIDATION_LIMITS.professionalTextMax),
  industry: optionalText(VALIDATION_LIMITS.industryMax),
  linkedin_url: optionalProfileUrl,
  bio: optionalText(VALIDATION_LIMITS.bioMax),
  hide_email: z.boolean().default(false),
  hide_phone: z.boolean().default(false),
  terms_accepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
});

export const fullRegistrationSchema = accountSchema.and(
  academicSchema.merge(personalSchema).merge(professionalSchema)
);

export type AccountInput = z.infer<typeof accountSchema>;
export type AcademicInput = z.infer<typeof academicSchema>;
export type PersonalInput = z.infer<typeof personalSchema>;
export type ProfessionalInput = z.infer<typeof professionalSchema>;
export type FullRegistrationInput = z.infer<typeof fullRegistrationSchema>;

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
