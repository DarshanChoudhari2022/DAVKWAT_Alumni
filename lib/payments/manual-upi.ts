export const MANUAL_MEMBERSHIP_PAYMENT = {
  payeeName: 'Subhash Singh Thakur',
  upiId: 'thakursubhashsingh-1@okaxis',
  transactionNote: 'DAVKAWT Alumni Membership Fee',
  currency: 'INR',
  whatsappNumber: '919773695456',
  /** QR image used for manual annual/monthly UPI payments */
  qrImage500: '/500.jpeg',
  /** Legacy QR image kept for old references and records */
  qrImage5000: '/5000.jpeg',
  /** Legacy single QR path (kept for backward compat) */
  qrImagePath: '/manual-membership-upi-qr.jpeg',
} as const;

export type MembershipAmount = 100 | 500 | 5000;

/**
 * Build a UPI deep-link for the selected membership amount.
 * On mobile, this opens the user's UPI app with the amount pre-filled.
 */
export function buildUpiPaymentUrl(amount?: MembershipAmount) {
  const params: Array<[string, string]> = [
    ['pa', MANUAL_MEMBERSHIP_PAYMENT.upiId],
    ['pn', MANUAL_MEMBERSHIP_PAYMENT.payeeName],
    ['tn', MANUAL_MEMBERSHIP_PAYMENT.transactionNote],
    ['cu', MANUAL_MEMBERSHIP_PAYMENT.currency],
  ];

  if (amount) {
    params.push(['am', String(amount)]);
  }

  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `upi://pay?${query}`;
}

export interface ManualPaymentWhatsappInput {
  fullName?: string;
  batchYear?: string;
  phone?: string;
  amount?: MembershipAmount;
  /** Supabase public URL of the uploaded payment proof screenshot */
  paymentProofUrl?: string;
}

/**
 * Build a WhatsApp deep-link for the user to send payment proof to Subhash Ji.
 * Includes amount, user details, and a link to the uploaded screenshot in Supabase.
 */
export function buildManualPaymentWhatsappUrl({
  fullName,
  batchYear,
  phone,
  amount,
  paymentProofUrl,
}: ManualPaymentWhatsappInput = {}) {
  const lines = [
    'Namaskar Subhash Ji, I have paid the DAVKAWT alumni membership fee.',
    '',
    `Amount: ₹${amount ? amount.toLocaleString('en-IN') : '___'}`,
    `UPI ID: ${MANUAL_MEMBERSHIP_PAYMENT.upiId}`,
    fullName ? `Name: ${fullName}` : 'Name:',
    batchYear ? `Batch year: ${batchYear}` : 'Batch year:',
    phone ? `Phone: ${phone}` : 'Phone:',
    '',
    paymentProofUrl
      ? `Payment proof screenshot: ${paymentProofUrl}`
      : 'I am sharing the payment screenshot/transaction ID for manual verification.',
  ];

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${MANUAL_MEMBERSHIP_PAYMENT.whatsappNumber}?text=${text}`;
}
