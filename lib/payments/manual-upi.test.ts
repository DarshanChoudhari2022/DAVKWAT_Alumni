import { describe, expect, it } from 'vitest';
import {
  buildManualPaymentWhatsappUrl,
  buildUpiPaymentUrl,
  MANUAL_MEMBERSHIP_PAYMENT,
} from './manual-upi';

describe('manual UPI payment helpers', () => {
  it('builds a UPI deep link with the configured payee details', () => {
    const url = buildUpiPaymentUrl();

    expect(url).toContain('pa=9773695456%40ptsbi');
    expect(url).toContain('pn=Subhash%20Singh%20Thakur');
    expect(url).toContain('tn=DAVKAWT%20Alumni%20Membership%20Fee');
    expect(url).toContain('cu=INR');
  });

  it('builds a WhatsApp proof handoff with the support number and payment context', () => {
    const url = buildManualPaymentWhatsappUrl({
      fullName: 'Asha Kumar',
      batchYear: '2012',
      phone: '9876543210',
    });

    expect(url).toContain(`https://wa.me/${MANUAL_MEMBERSHIP_PAYMENT.whatsappNumber}`);
    expect(decodeURIComponent(url)).toContain('Asha Kumar');
    expect(decodeURIComponent(url)).toContain('2012');
    expect(decodeURIComponent(url)).toContain('9876543210');
    expect(decodeURIComponent(url)).toContain(MANUAL_MEMBERSHIP_PAYMENT.upiId);
  });
});
