import { describe, expect, it } from 'vitest';
import { getSchoolProofUrl } from './proof-url';

describe('getSchoolProofUrl', () => {
  it('prefers the dedicated school document URL', () => {
    expect(
      getSchoolProofUrl({
        school_document_url: 'https://storage.example/school.png',
        website_url: 'https://example.com',
      })
    ).toBe('https://storage.example/school.png');
  });

  it('falls back to legacy website_url proof storage', () => {
    expect(
      getSchoolProofUrl({
        school_document_url: null,
        website_url: 'https://storage.example/legacy-school.png',
      })
    ).toBe('https://storage.example/legacy-school.png');
  });
});
