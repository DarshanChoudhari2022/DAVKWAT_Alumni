import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { cn } from '@/lib/utils/cn';

// Trivial smoke test confirming the test harness is wired up correctly:
// - Vitest runs and assertions pass
// - the `@/` path alias resolves (matches tsconfig.json paths)
// - @testing-library/react + jsdom can render a component
// - @testing-library/jest-dom matchers are available
describe('test harness', () => {
  it('runs a trivial passing assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('resolves the @/ path alias', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('renders a component with jsdom and jest-dom matchers', () => {
    render(<div>harness ready</div>);
    expect(screen.getByText('harness ready')).toBeInTheDocument();
  });
});
