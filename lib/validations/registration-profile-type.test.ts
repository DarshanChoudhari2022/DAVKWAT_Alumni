import { describe, expect, it } from 'vitest';
import {
  alumniAcademicSchema,
  facultyRegistrationSchema,
} from './registration';

const account = {
  email: 'teacher@example.com',
  password: 'Password1',
  confirmPassword: 'Password1',
};

describe('registration profile type validation', () => {
  it('requires a stream only for 12th senior secondary alumni', () => {
    expect(
      alumniAcademicSchema.safeParse({
        full_name: 'Asha Kumar',
        education_level: 'senior_secondary',
        passing_year: 2012,
      }).success
    ).toBe(false);

    const parsed = alumniAcademicSchema.safeParse({
      full_name: 'Asha Kumar',
      education_level: 'senior_secondary',
      education_stream: 'Science',
      passing_year: 2012,
      passing_year_10th: 2010,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.batch_year).toBe(2010);
      expect(parsed.data.course).toBe('Science');
    }
  });

  it('maps secondary and left-before-10th alumni into compatibility fields', () => {
    const secondary = alumniAcademicSchema.parse({
      full_name: 'Rahul Singh',
      education_level: 'secondary',
      passing_year: 2010,
    });
    const leftBefore10th = alumniAcademicSchema.parse({
      full_name: 'Maya Singh',
      education_level: 'left_before_10th',
      left_before_schooling_class: 'Class 8',
      passing_year: 2008,
    });

    expect(secondary.course).toBe('Secondary (10th)');
    expect(leftBefore10th.course).toBe('Schooling (studied till Class 8)');
  });

  it('validates faculty teaching years and subject', () => {
    const parsed = facultyRegistrationSchema.safeParse({
      ...account,
      full_name: 'Rita Sharma',
      phone: '9876543210',
      current_country: 'India',
      taught_subject: 'Mathematics',
      taught_from_year: 2001,
      taught_to_year: 2010,
      terms_accepted: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.profile_type).toBe('faculty');
      expect(parsed.data.batch_year).toBe(2001);
      expect(parsed.data.course).toBe('Faculty');
    }
  });

  it('rejects faculty taught-to year earlier than taught-from year', () => {
    expect(
      facultyRegistrationSchema.safeParse({
        ...account,
        full_name: 'Rita Sharma',
        current_country: 'India',
        taught_subject: 'Mathematics',
        taught_from_year: 2012,
        taught_to_year: 2009,
        terms_accepted: true,
      }).success
    ).toBe(false);
  });
});
