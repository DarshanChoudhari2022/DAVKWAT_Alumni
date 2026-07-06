import { describe, expect, it } from 'vitest';
import { adminProfileUpdateSchema } from './admin';
import { personalSchema, alumniAcademicSchema } from './registration';
import { profileUpdateSchema } from './profile';

function validProfileUpdate(overrides: Record<string, unknown> = {}) {
  return {
    full_name: 'Asha Kumar',
    batch_year: 2012,
    course: 'Science',
    hide_email: false,
    hide_phone: false,
    ...overrides,
  };
}

describe('alumni profile validation hardening', () => {
  it('rejects long or malformed phone numbers everywhere profile phones are accepted', () => {
    const invalidPhone = '9309393216979797997959495';

    expect(personalSchema.safeParse({ phone: invalidPhone, current_country: 'India' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse(validProfileUpdate({ phone: invalidPhone })).success).toBe(false);
    expect(adminProfileUpdateSchema.safeParse({ phone: invalidPhone }).success).toBe(false);
    expect(adminProfileUpdateSchema.safeParse({ alternate_phone: invalidPhone }).success).toBe(false);
  });

  it('accepts blank optional phone fields and valid Indian mobile numbers', () => {
    expect(personalSchema.safeParse({ phone: '', current_country: 'India' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse(validProfileUpdate({ phone: '9876543210' })).success).toBe(true);
    expect(adminProfileUpdateSchema.safeParse({ phone: '9876543210', alternate_phone: '' }).success).toBe(true);
  });

  it('rejects future dates of birth', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    expect(personalSchema.safeParse({ date_of_birth: futureDate, current_country: 'India' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse(validProfileUpdate({ date_of_birth: futureDate })).success).toBe(false);
  });

  it('normalizes names and bounds text fields before storage', () => {
    const parsed = alumniAcademicSchema.parse({
      full_name: '  Asha   Kumar  ',
      education_level: 'senior_secondary',
      education_stream: 'Science',
      passing_year: 2012,
      roll_number: '  R-42  ',
    });

    expect(parsed.full_name).toBe('Asha Kumar');
    expect(parsed.roll_number).toBe('R-42');
    expect(parsed.batch_year).toBe(2012);
    expect(parsed.course).toBe('Science');
  });
});
