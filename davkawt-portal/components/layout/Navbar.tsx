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
      setIsScrolled(window.scrollY > 24);
    };

    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateNavbar);
    };
  }, [isLandingPage]);

  const isTopDark = isLandingPage && !isScrolled;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b shadow-sm transition-colors duration-300',
        isTopDark
          ? 'border-white/10 bg-[#0a1130]'
          : 'border-slate-200 bg-white',
      )}
    >
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="DAVKAWT Home"
          className={cn(
            'font-sans text-[25px] font-extrabold leading-none tracking-[-0.075em] transition-colors',
            isTopDark ? 'text-white' : 'text-[#111827]',
          )}
        >
          DAVKAWT
        </Link>

        <nav
          className={cn(
            'hidden items-center gap-1 rounded-full border px-2 py-1.5 shadow-sm md:flex',
            isTopDark ? 'border-white/10 bg-white/[0.08]' : 'border-slate-200 bg-slate-50',
          )}
          aria-label="Primary"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-full px-4 py-2 font-sans text-[14px] font-medium leading-none transition-colors',
                isTopDark
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-[#1f2937] hover:bg-white hover:text-[#0F2557]',
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
              isTopDark ? 'text-white/85 hover:text-white' : 'text-[#1f2937] hover:text-[#0F2557]',
            )}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={cn(
              'inline-flex h-9 items-center rounded-full border px-5 font-sans text-[15px] font-medium leading-none transition-colors',
              isTopDark
                ? 'border-white/35 bg-white text-[#111827] hover:bg-slate-100'
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
