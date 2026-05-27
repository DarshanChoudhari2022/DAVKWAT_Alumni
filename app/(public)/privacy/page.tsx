import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Privacy Policy — DAVKAWT' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
        Privacy Policy
      </h1>
      <Card className="mt-8 p-6 sm:p-8">
        <div className="prose-davkawt max-w-none text-sm leading-relaxed">
          <p>Last updated: January 2025</p>

          <h2>1. Information We Collect</h2>
          <p>We collect the following information during registration and profile updates:</p>
          <ul>
            <li>Personal details: name, email, phone, date of birth, gender</li>
            <li>Academic details: batch year, course, roll number</li>
            <li>Professional details: occupation, company, job title, LinkedIn URL</li>
            <li>Location: city, state, country</li>
            <li>Payment information (processed securely via Easebuzz — we do not store card details)</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To verify your identity as a DAV Khagaul alumnus</li>
            <li>To populate the alumni directory (subject to your privacy settings)</li>
            <li>To send relevant notifications about events, announcements, and membership</li>
            <li>To process membership payments</li>
            <li>To generate aggregate reports and statistics</li>
          </ul>

          <h2>3. Privacy Controls</h2>
          <p>
            You can hide your email and phone number from the alumni directory via your
            profile privacy settings. You control what is visible to other alumni.
          </p>

          <h2>4. Data Sharing</h2>
          <p>
            We do not sell or share your personal data with third parties. Data may be
            shared with:
          </p>
          <ul>
            <li>Easebuzz — for payment processing</li>
            <li>Resend — for transactional emails</li>
            <li>Supabase — as our database and authentication provider</li>
          </ul>

          <h2>5. Data Security</h2>
          <p>
            We implement industry-standard security measures including encrypted
            connections (HTTPS), Row-Level Security (RLS) policies on our database,
            and secure authentication via Supabase Auth.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            Your data is retained as long as your account is active. If you request
            account deletion, we will remove your personal data within 30 days,
            except where retention is required by law.
          </p>

          <h2>7. Your Rights</h2>
          <ul>
            <li>Access your personal data via your profile page</li>
            <li>Update or correct your information at any time</li>
            <li>Request deletion of your account by contacting an administrator</li>
            <li>Opt out of non-essential communications</li>
          </ul>

          <h2>8. Contact</h2>
          <p>
            For privacy concerns, contact us at{' '}
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
