import { describe, expect, it } from 'vitest';
import {
  buildManualPaymentWhatsappUrl,
  buildUpiPaymentUrl,
  MANUAL_MEMBERSHIP_PAYMENT,
} from './manual-upi';

describe('manual UPI payment helpers', () => {
  it('builds a UPI deep link with the configured payee details (no amount)', () => {
    const url = buildUpiPaymentUrl();

    expect(url).toContain('pa=thakursubhashsingh-1%40okaxis');
    expect(url).toContain('pn=Subhash%20Singh%20Thakur');
    expect(url).toContain('tn=DAVKAWT%20Alumni%20Membership%20Fee');
    expect(url).toContain('cu=INR');
    expect(url).not.toContain('am=');
  });

  it('builds a UPI deep link with ₹500 amount', () => {
    const url = buildUpiPaymentUrl(500);

    expect(url).toContain('am=500');
    expect(url).toContain('pa=thakursubhashsingh-1%40okaxis');
  });

  it('builds a UPI deep link with ₹5000 amount', () => {
    const url = buildUpiPaymentUrl(5000);

    expect(url).toContain('am=5000');
  });

  it('uses Subhash Ji WhatsApp number (919773695456)', () => {
    expect(MANUAL_MEMBERSHIP_PAYMENT.whatsappNumber).toBe('919773695456');
  });

  it('builds a WhatsApp proof handoff with the support number and payment context', () => {
    const url = buildManualPaymentWhatsappUrl({
      fullName: 'Asha Kumar',
      batchYear: '2012',
      phone: '9876543210',
      amount: 5000,
    });

    expect(url).toContain(`https://wa.me/${MANUAL_MEMBERSHIP_PAYMENT.whatsappNumber}`);
    expect(decodeURIComponent(url)).toContain('Asha Kumar');
    expect(decodeURIComponent(url)).toContain('2012');
    expect(decodeURIComponent(url)).toContain('9876543210');
    expect(decodeURIComponent(url)).toContain('₹5,000');
    expect(decodeURIComponent(url)).toContain(MANUAL_MEMBERSHIP_PAYMENT.upiId);
    expect(decodeURIComponent(url)).toContain('Subhash Ji');
  });

  it('includes payment proof URL in WhatsApp message when provided', () => {
    const proofUrl = 'https://jaeuirztfbozglvfrfav.supabase.co/storage/v1/object/public/payment-proofs/test.jpg';
    const url = buildManualPaymentWhatsappUrl({
      fullName: 'Test User',
      amount: 500,
      paymentProofUrl: proofUrl,
    });

    expect(decodeURIComponent(url)).toContain(proofUrl);
  });
});
