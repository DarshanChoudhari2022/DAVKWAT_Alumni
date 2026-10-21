import { describe, expect, it } from 'vitest';
import { personalSchema, facultyDetailsSchema } from './registration';

describe('registration mobile validation', () => {
  it.each(['987654321', '98765432101', '+91987654321', '+9198765432101', '+9198765abcde', '+9999876543210', '98765 43210'])(
    'rejects an invalid mobile number: %s', (phone) => {
      expect(personalSchema.safeParse({ phone }).success).toBe(false);
    }
  );

  it.each(['9876543210', '+919876543210', '+12025550143', '+449876543210', '', undefined])(
    'accepts a blank optional phone or 10 digits with a separate calling code: %s', (phone) => {
      expect(personalSchema.safeParse({ phone }).success).toBe(true);
    }
  );

  it('applies the same restriction to faculty registrations', () => {
    const faculty = {
      full_name: 'Asha Kumar', taught_subject: 'Maths', taught_from_year: 2010,
      terms_accepted: true,
    };
    expect(facultyDetailsSchema.safeParse({ ...faculty, phone: '987654321' }).success).toBe(false);
    expect(facultyDetailsSchema.safeParse({ ...faculty, phone: '9876543210' }).success).toBe(true);
  });
});
