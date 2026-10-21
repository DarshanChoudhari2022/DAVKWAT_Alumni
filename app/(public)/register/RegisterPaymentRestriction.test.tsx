import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));
vi.mock('./actions', () => ({ registerAction: vi.fn(), checkEmailExists: vi.fn().mockResolvedValue(false) }));
vi.mock('next/dynamic', () => ({
  default: () => function PhotoInput({ name, onChange }: { name: string; onChange: (file: File) => void }) {
    return <input aria-label="Profile photo" name={name} type="file" onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) onChange(file);
    }} />;
  },
}));

import { RegisterPageClient } from './RegisterPageClient';

describe('registration payment restriction', () => {
  beforeEach(() => {
    localStorage.clear();
    navigation.push.mockClear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('opens the form, lets users fill the first four steps, then navigates to the payment 404', async () => {
    const { container } = render(<RegisterPageClient />);
    const change = (name: string, value: string) => {
      const input = container.querySelector(`[name="${name}"]`);
      if (!input) throw new Error(`Missing field: ${name}`);
      fireEvent.change(input, { target: { value } });
    };

    expect(screen.getByText('Step 1 of 5: Account')).toBeInTheDocument();
    expect(screen.queryByText(/Scan this QR/)).not.toBeInTheDocument();
    expect(container.querySelector('[name="payment_proof"]')).toBeNull();
    change('email', 'alumni@example.com');
    change('password', 'Password123');
    change('confirmPassword', 'Password123');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Step 2 of 5: Academic');
    change('full_name', 'Asha Kumar');
    change('education_level', 'secondary');
    change('passing_year', '2012');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Step 3 of 5: Personal');
    change('phone_number', '9876543210');
    fireEvent.change(screen.getByLabelText('Profile photo'), {
      target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Step 4 of 5: Professional');
    const terms = container.querySelector('[name="terms_accepted"]');
    if (!terms) throw new Error('Missing terms checkbox');
    fireEvent.click(terms);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith('/register/payment'));
    expect(screen.queryByText(/Scan this QR/)).not.toBeInTheDocument();
  });

  it('restores old payment-step drafts to the professional step', async () => {
    localStorage.setItem('davkawt_register_draft', JSON.stringify({ step: 4 }));
    render(<RegisterPageClient />);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await waitFor(() => expect(screen.getByText('Step 4 of 5: Professional')).toBeInTheDocument());
    expect(screen.queryByText(/Scan this QR/)).not.toBeInTheDocument();
  });
});
