import { z } from 'zod';

const CURRENT_YEAR = new Date().getFullYear();

export const accountSchema = z
  .object({
    email: z.string().email('Enter a valid email').max(254),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .max(128)
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
  full_name: z.string().min(2, 'Required').max(120),
  batch_year: z
    .number({ invalid_type_error: 'Required' })
    .int()
    .min(1950, 'Too early')
    .max(CURRENT_YEAR, 'In the future'),
  course: z.enum(['Science', 'Commerce', 'Arts', 'Other'], {
    errorMap: () => ({ message: 'Select a course' }),
  }),
  roll_number: z.string().max(40).optional().or(z.literal('')),
});

export const personalSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number')
    .optional()
    .or(z.literal('')),
  current_city: z.string().max(80).optional().or(z.literal('')),
  current_state: z.string().max(80).optional().or(z.literal('')),
  current_country: z.string().max(80).default('India'),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

export const professionalSchema = z.object({
  occupation: z.string().max(120).optional().or(z.literal('')),
  company: z.string().max(120).optional().or(z.literal('')),
  job_title: z.string().max(120).optional().or(z.literal('')),
  industry: z.string().max(80).optional().or(z.literal('')),
  linkedin_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Max 500 characters').optional().or(z.literal('')),
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
