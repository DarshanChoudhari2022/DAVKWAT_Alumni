import { z } from 'zod';
import { INPUT_PATTERNS, VALIDATION_LIMITS, VALIDATION_MESSAGES, todayIsoDate } from './constraints';
import { COUNTRY_CODES } from '@/lib/phone-country-codes';

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

// Registration stores the selected calling code followed by a 10-digit number.
// Match only supported codes so extra digits cannot be mistaken for a country code.
export const optionalRegistrationMobile = z
  .string()
  .trim()
  .refine((value) => {
    if (/^[0-9]{10}$/.test(value)) return true;
    return COUNTRY_CODES.some(({ code }) =>
      value.startsWith(code) && /^[0-9]{10}$/.test(value.slice(code.length))
    );
  }, VALIDATION_MESSAGES.mobileNumber)
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
