import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-slate-600">
              The official digital home of DAV Khagaul Alumni Welfare Trust -
              connecting verified alumni, Trust updates, events, membership, and welfare
              initiatives.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Portal</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { href: '/about', label: 'About the Trust' },
                { href: '/register', label: 'Register as Alumnus' },
                { href: '/login', label: 'Member Login' },
                { href: '/login?redirect=/admin', label: 'Admin Login' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-600 hover:text-[#0F2557]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-slate-600 hover:text-[#0F2557]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-600 hover:text-[#0F2557]">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-slate-600 hover:text-[#0F2557]">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center">
          <p>
            &copy; {new Date().getFullYear()} DAV Khagaul Alumni Welfare Trust. All rights reserved.
          </p>
          <p>Registered Educational Trust - Bihar, India</p>
        </div>
      </div>
    </footer>
  );
}
