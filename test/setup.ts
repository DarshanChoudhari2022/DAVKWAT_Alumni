// Global test setup shared across the Vitest suite.
//
// Wires @testing-library/jest-dom custom matchers (e.g. toBeInTheDocument,
// toHaveTextContent) into Vitest's `expect`, and cleans up the jsdom DOM
// after every test so render tests stay isolated.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
