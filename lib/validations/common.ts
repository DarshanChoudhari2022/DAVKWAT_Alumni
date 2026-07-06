import { z } from 'zod';
import { INPUT_PATTERNS, VALIDATION_LIMITS, VALIDATION_MESSAGES, todayIsoDate } from './constraints';

export function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export const requiredName = z
  .string()
  .transform(normalizeWhitespace)
  .pipe(z.string().min(2, 'Required').max(VALIDATION_LIMITS.nameMax));

export function optionalText(max: number) {
  return z
    .string()
    .transform(normalizeWhitespace)
    .pipe(z.string().max(max))
    .optional()
    .or(z.literal(''));
}

export const optionalIndianMobile = z
  .string()
  .trim()
  .regex(new RegExp(`^${INPUT_PATTERNS.indianMobile}$`), VALIDATION_MESSAGES.indianMobile)
  .optional()
  .or(z.literal(''));

export const nullableIndianMobile = z
  .string()
  .trim()
  .regex(new RegExp(`^${INPUT_PATTERNS.indianMobile}$`), VALIDATION_MESSAGES.indianMobile)
  .optional()
  .nullable()
  .or(z.literal(''));

/** Accepts international numbers like +919876543210, +12025550143, or plain 10-digit Indian numbers */
export const optionalInternationalPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, VALIDATION_MESSAGES.internationalPhone)
  .optional()
  .or(z.literal(''));

export const nullableInternationalPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, VALIDATION_MESSAGES.internationalPhone)
  .optional()
  .nullable()
  .or(z.literal(''));

export const optionalProfileUrl = z
  .string()
  .trim()
  .max(VALIDATION_LIMITS.urlMax)
  .url('Enter a valid URL')
  .optional()
  .nullable()
  .or(z.literal(''));

export const optionalDateOfBirth = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a valid date')
  .refine((value) => value === '' || value >= VALIDATION_LIMITS.minBirthDate, VALIDATION_MESSAGES.oldDate)
  .refine((value) => value === '' || value <= todayIsoDate(), VALIDATION_MESSAGES.futureDate)
  .optional()
  .or(z.literal(''));
