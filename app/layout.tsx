import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { resolveAppUrl } from '@/lib/utils/app-url';
import './globals.css';

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DAVKAWT Alumni Portal',
    template: '%s | DAVKAWT Alumni Portal',
  },
  description:
    'Official alumni portal of DAV Khagaul Alumni Welfare Trust — connecting generations of alumni across India and the world.',
  metadataBase: new URL(resolveAppUrl()),
  openGraph: {
    type: 'website',
    siteName: 'DAVKAWT Alumni Portal',
    locale: 'en_IN',
    title: 'DAVKAWT Alumni Portal',
    description:
      'Official alumni portal of DAV Khagaul Alumni Welfare Trust — connecting generations of alumni across India and the world.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DAVKAWT Alumni Portal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DAVKAWT Alumni Portal',
    description:
      'Official alumni portal of DAV Khagaul Alumni Welfare Trust — connecting generations of alumni across India and the world.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F2557',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
