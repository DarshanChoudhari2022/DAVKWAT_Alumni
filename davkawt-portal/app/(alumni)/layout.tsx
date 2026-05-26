import Link from 'next/link';
import { LayoutDashboard, Users, Calendar, MessageSquare, Megaphone, CreditCard, User } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { logoutAction } from '@/app/(public)/login/actions';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/forum', label: 'Forum', icon: MessageSquare },
  { href: '/membership', label: 'Membership', icon: CreditCard },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function AlumniLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-2" aria-label="Alumni navigation">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <item.icon className="h-4 w-4 text-slate-500" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-3">
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Logo />
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <main id="main" className="flex-1 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white lg:hidden"
        aria-label="Alumni navigation"
      >
        {NAV.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-slate-600"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
