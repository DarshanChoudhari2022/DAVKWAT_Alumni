import { z } from 'zod';
import {
  optionalDateOfBirth,
  optionalInternationalPhone,
  optionalProfileUrl,
  optionalText,
  requiredName,
} from './common';
import { VALIDATION_LIMITS } from './constraints';

export const PROFILE_TYPES = ['alumni', 'faculty'] as const;
export const EDUCATION_LEVELS = [
  'left_before_10th',
  'secondary',
  'senior_secondary',
] as const;
export const EDUCATION_STREAMS = ['Science', 'Commerce', 'Arts'] as const;

/** Classes a student may have left at before completing 10th */
export const LEFT_BEFORE_CLASSES = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9',
] as const;

export const EDUCATION_LEVEL_LABELS: Record<(typeof EDUCATION_LEVELS)[number], string> = {
  left_before_10th: 'Left before completing Secondary (10th)',
  secondary: 'Secondary (10th)',
  senior_secondary: 'Higher Secondary (12th)',
};

/**
 * Extract the class number from strings like "Class 8", "class 5", etc.
 * Returns the number or null if parsing fails.
 */
export function extractClassNumber(classStr: string): number | null {
  const match = classStr.match(/(\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

/**
 * Calculate the equivalent 10th-batch year for students who left before 10th.
 * If a student left at Class 8 in year Y, their batch year = Y + (10 - 8) = Y + 2.
 */
export function calculateBatchYear(
  educationLevel: (typeof EDUCATION_LEVELS)[number],
  passingYear: number,
  leftBeforeSchoolingClass?: string
): number {
  if (educationLevel === 'left_before_10th' && leftBeforeSchoolingClass) {
    const classNum = extractClassNumber(leftBeforeSchoolingClass);
    if (classNum && classNum >= 1 && classNum <= 9) {
      return passingYear + (10 - classNum);
    }
  }
  return passingYear;
}

export function courseForEducationLevel(
  educationLevel: (typeof EDUCATION_LEVELS)[number],
  educationStream?: (typeof EDUCATION_STREAMS)[number] | '',
  leftBeforeSchoolingClass?: string
) {
  if (educationLevel === 'senior_secondary') return educationStream || 'Higher Secondary (12th)';
  if (educationLevel === 'left_before_10th') {
    return leftBeforeSchoolingClass
      ? `Schooling (studied till ${leftBeforeSchoolingClass})`
      : 'Left before completing Secondary (10th)';
  }
  return EDUCATION_LEVEL_LABELS[educationLevel];
}

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

const yearSchema = z
  .number({ invalid_type_error: 'Required' })
  .int()
  .min(VALIDATION_LIMITS.minBatchYear, 'Too early')
  .max(VALIDATION_LIMITS.maxBatchYear, 'In the future');

export const alumniAcademicSchema = z
  .object({
    full_name: requiredName,
    education_level: z.enum(EDUCATION_LEVELS, {
      errorMap: () => ({ message: 'Select education level' }),
    }),
    education_stream: z.enum(EDUCATION_STREAMS).optional().or(z.literal('')),
    left_before_schooling_class: z.string().trim().max(50).optional().or(z.literal('')),
    passing_year: yearSchema,
    passing_year_10th: yearSchema.optional().nullable(),
    roll_number: optionalText(VALIDATION_LIMITS.rollNumberMax),
  })
  .superRefine((data, ctx) => {
    if (data.education_level === 'left_before_10th') {
      if (!data.left_before_schooling_class) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['left_before_schooling_class'],
          message: 'Mention till what class you studied',
        });
      }
    }
    if (data.education_level === 'senior_secondary') {
      if (!data.education_stream) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['education_stream'],
          message: 'Select Science, Commerce, or Arts',
        });
      }
      if (!data.passing_year_10th) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['passing_year_10th'],
          message: 'Required',
        });
      } else if (data.passing_year_10th > data.passing_year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['passing_year_10th'],
          message: 'Secondary passing year must be earlier than Higher Secondary passing year',
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    profile_type: 'alumni' as const,
    batch_year: calculateBatchYear(data.education_level, data.passing_year, data.left_before_schooling_class),
    course: courseForEducationLevel(data.education_level, data.education_stream, data.left_before_schooling_class),
  }));

export const academicSchema = alumniAcademicSchema;

export const personalSchema = z.object({
  phone: optionalInternationalPhone,
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

export const facultyDetailsSchema = z
  .object({
    full_name: requiredName,
    phone: optionalInternationalPhone,
    current_city: optionalText(VALIDATION_LIMITS.placeMax),
    current_state: optionalText(VALIDATION_LIMITS.placeMax),
    current_country: optionalText(VALIDATION_LIMITS.placeMax).default('India'),
    taught_subject: optionalText(VALIDATION_LIMITS.professionalTextMax).pipe(
      z.string().min(2, 'Subject taught is required')
    ),
    taught_from_year: yearSchema,
    taught_to_year: yearSchema.optional().nullable(),
    bio: optionalText(VALIDATION_LIMITS.bioMax),
    hide_email: z.boolean().default(false),
    hide_phone: z.boolean().default(false),
    terms_accepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
  })
  .superRefine((data, ctx) => {
    if (data.taught_to_year && data.taught_to_year < data.taught_from_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taught_to_year'],
        message: 'Taught till year cannot be earlier than taught from year',
      });
    }
  })
  .transform((data) => ({
    ...data,
    profile_type: 'faculty' as const,
    batch_year: data.taught_from_year,
    course: 'Faculty',
  }));

export const fullRegistrationSchema = accountSchema.and(
  alumniAcademicSchema.and(personalSchema).and(professionalSchema)
);

export const facultyRegistrationSchema = accountSchema.and(facultyDetailsSchema);

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
