import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MobileNumberInput } from './MobileNumberInput';

describe('MobileNumberInput', () => {
  it('removes non-digits and limits pasted input to 10 digits', () => {
    render(<MobileNumberInput aria-label="Mobile number" />);
    const input = screen.getByRole('textbox', { name: 'Mobile number' });
    fireEvent.input(input, { target: { value: '98765abc43210123' } });
    expect(input).toHaveValue('9876543210');
    expect(input).toBeValid();
  });

  it('rejects fewer than 10 digits without padding or changing the number', () => {
    render(<MobileNumberInput aria-label="Mobile number" />);
    const input = screen.getByRole('textbox', { name: 'Mobile number' });
    fireEvent.input(input, { target: { value: '987654321' } });
    expect(input).toHaveValue('987654321');
    expect(input).toBeInvalid();
  });
});
