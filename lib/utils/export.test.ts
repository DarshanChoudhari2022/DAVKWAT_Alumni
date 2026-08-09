import { describe, expect, it } from 'vitest';
import { arrayToCSV, arrayToXLSX } from './export';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
];

describe('export utilities', () => {
  it('escapes CSV values containing commas and quotes', () => {
    expect(arrayToCSV([{ name: 'Singh, "Amit"', city: 'Pune' }], columns)).toBe(
      'Name,City\n"Singh, ""Amit""",Pune'
    );
  });

  it('creates a valid XLSX zip buffer', async () => {
    const buffer = await arrayToXLSX([{ name: 'Amit Singh', city: 'Pune' }], columns);
    expect(buffer.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
