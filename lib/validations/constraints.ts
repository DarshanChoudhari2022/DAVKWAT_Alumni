const CURRENT_YEAR = new Date().getFullYear();

export const VALIDATION_LIMITS = {
  nameMax: 120,
  displayNameMax: 120,
  emailMax: 254,
  passwordMax: 128,
  rollNumberMax: 40,
  placeMax: 80,
  professionalTextMax: 120,
  industryMax: 80,
  urlMax: 300,
  bioMax: 500,
  achievementsMax: 1000,
  planNameMax: 100,
  planDescriptionMax: 500,
  trustNameMax: 160,
  contactPhoneMax: 20,
  aboutShortMax: 400,
  minBatchYear: 1950,
  maxBatchYear: CURRENT_YEAR,
  minBirthDate: '1900-01-01',
} as const;

export const INPUT_PATTERNS = {
  indianMobile: '[6-9][0-9]{9}',
  internationalPhone: '\\+?[0-9]{7,15}',
} as const;

export const VALIDATION_MESSAGES = {
  indianMobile: 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
  internationalPhone: 'Enter a valid phone number (7-15 digits, optionally starting with +)',
  futureDate: 'Date of birth cannot be in the future',
  oldDate: 'Enter a realistic date of birth',
} as const;

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
