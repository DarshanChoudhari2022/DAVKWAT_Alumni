export const MANUAL_MEMBERSHIP_PAYMENT = {
  payeeName: 'Subhash Singh Thakur',
  upiId: '9773695456@ptsbi',
  transactionNote: 'DAVKAWT Alumni Membership Fee',
  currency: 'INR',
  whatsappNumber: '919373405399',
  qrImagePath: '/manual-membership-upi-qr.jpeg',
} as const;

export function buildUpiPaymentUrl() {
  const params: Array<[string, string]> = [
    ['pa', MANUAL_MEMBERSHIP_PAYMENT.upiId],
    ['pn', MANUAL_MEMBERSHIP_PAYMENT.payeeName],
    ['tn', MANUAL_MEMBERSHIP_PAYMENT.transactionNote],
    ['cu', MANUAL_MEMBERSHIP_PAYMENT.currency],
  ];
  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `upi://pay?${query}`;
}

export interface ManualPaymentWhatsappInput {
  fullName?: string;
  batchYear?: string;
  phone?: string;
}

export function buildManualPaymentWhatsappUrl({
  fullName,
  batchYear,
  phone,
}: ManualPaymentWhatsappInput = {}) {
  const lines = [
    'Hello DAVKAWT team, I have paid the alumni membership fee.',
    '',
    `UPI ID: ${MANUAL_MEMBERSHIP_PAYMENT.upiId}`,
    fullName ? `Name: ${fullName}` : 'Name:',
    batchYear ? `Batch year: ${batchYear}` : 'Batch year:',
    phone ? `Phone: ${phone}` : 'Phone:',
    '',
    'I am sharing the payment screenshot/transaction ID for manual verification.',
  ];

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${MANUAL_MEMBERSHIP_PAYMENT.whatsappNumber}?text=${text}`;
}
