'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'Trust' },
  { href: '/#events', label: 'Events' },
  { href: '/#announcements', label: 'Announcements' },
];

export function Navbar() {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(!isLandingPage);

  useEffect(() => {
    if (!isLandingPage) {
      setIsScrolled(true);
      return;
    }

    const updateNavbar = () => {
      setIsScrolled(window.scrollY > 18);
    };

    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateNavbar);
    };
  }, [isLandingPage]);

  const isDarkTop = isLandingPage && !isScrolled;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300',
        isDarkTop
          ? 'border-white/10 bg-[#0a1130]'
          : 'border-slate-200/80 bg-white/95 shadow-sm supports-[backdrop-filter]:bg-white/85',
      )}
    >
      <div className="mx-auto flex h-[58px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="DAVKAWT Home"
          className={cn(
            'font-sans text-[25px] font-extrabold leading-none tracking-[-0.075em] transition-colors',
            isDarkTop ? 'text-white' : 'text-[#111827]',
          )}
        >
          DAVKAWT
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'font-sans text-[15px] font-medium leading-none transition-colors',
                isDarkTop ? 'text-white/85 hover:text-white' : 'text-[#1f2937] hover:text-[#0F2557]',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={cn(
              'hidden font-sans text-[15px] font-medium leading-none transition-colors sm:inline-flex',
              isDarkTop ? 'text-white/85 hover:text-white' : 'text-[#1f2937] hover:text-[#0F2557]',
            )}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={cn(
              'inline-flex h-9 items-center rounded-full border px-5 font-sans text-[15px] font-medium leading-none transition-colors',
              isDarkTop
                ? 'border-white/35 bg-transparent text-white hover:bg-white/10'
                : 'border-[#111827] bg-white text-[#111827] hover:bg-slate-50',
            )}
          >
            Join now
          </Link>
        </div>
      </div>
    </header>
  );
}
