import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Terms & Conditions — DAVKAWT' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
        Terms &amp; Conditions
      </h1>
      <Card className="mt-8 p-6 sm:p-8">
        <div className="prose-davkawt max-w-none text-sm leading-relaxed">
          <p>Last updated: January 2025</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By registering on the DAVKAWT Alumni Portal, you agree to be bound by these Terms
            &amp; Conditions. If you do not agree, please do not register or use the portal.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            The portal is exclusively for alumni of DAV Public School, Khagaul. Registration
            is subject to verification and approval by the DAVKAWT committee. Providing false
            information will result in account deactivation.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials.
            You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2>4. Acceptable Use</h2>
          <ul>
            <li>Do not post offensive, defamatory, or illegal content on forums.</li>
            <li>Do not spam or harass other alumni.</li>
            <li>Do not use the alumni directory data for commercial purposes.</li>
            <li>Do not attempt to access accounts or data of other users.</li>
          </ul>

          <h2>5. Membership &amp; Payments</h2>
          <p>
            Paid membership fees are non-refundable unless explicitly stated. Membership
            benefits are subject to change with prior notice. Payments are processed securely
            through Easebuzz.
          </p>

          <h2>6. Content</h2>
          <p>
            You retain ownership of content you post. By posting, you grant DAVKAWT a
            non-exclusive license to display it on the portal. We reserve the right to
            remove content that violates these terms.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            DAV Khagaul Alumni Welfare Trust is not liable for any direct, indirect, or
            consequential damages arising from your use of the portal. The portal is
            provided &quot;as is&quot; without warranties.
          </p>

          <h2>8. Modifications</h2>
          <p>
            We may update these terms at any time. Continued use of the portal after
            changes constitutes acceptance of the revised terms.
          </p>

          <h2>9. Contact</h2>
          <p>
            For questions regarding these terms, contact us at{' '}
            <a href="mailto:admin@davkawt.org" className="text-[#0F2557] hover:underline">
              admin@davkawt.org
            </a>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
