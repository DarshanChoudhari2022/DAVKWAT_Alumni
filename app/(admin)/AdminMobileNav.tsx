'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Megaphone,
  Calendar,
  MessageSquare,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { SignOutButton } from '@/components/shared/SignOutButton';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/approvals', label: 'Approvals', icon: UserCheck, badge: true },
  { href: '/admin/alumni', label: 'Alumni', icon: Users },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/forum', label: 'Forum', icon: MessageSquare },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings, superAdminOnly: true },
];

interface AdminMobileNavProps {
  displayName: string;
  isSuperAdmin: boolean;
  pendingCount: number;
  logoutAction: () => void | Promise<void>;
}

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminMobileNav({
  displayName,
  isSuperAdmin,
  pendingCount,
  logoutAction,
}: AdminMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleNav = ADMIN_NAV.filter((item) => !item.superAdminOnly || isSuperAdmin);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const activeItem = visibleNav.find((item) => isActive(pathname, item.href, item.exact));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-4 lg:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <Menu className="h-5 w-5" />
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content
              className="fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-xs flex-col border-r border-slate-200 bg-white shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left data-[state=open]:duration-200 data-[state=closed]:duration-150"
              aria-label="Admin navigation"
            >
              <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                <div className="flex items-center gap-2">
                  <Logo />
                  <Badge variant="primary" className="text-[10px]">Admin</Badge>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              <Dialog.Title className="sr-only">Admin navigation menu</Dialog.Title>

              <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Admin navigation">
                <ul className="space-y-1">
                  {visibleNav.map((item) => {
                    const active = isActive(pathname, item.href, item.exact);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                            active
                              ? 'bg-[#0F2557] text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <item.icon className={cn('h-4 w-4', active ? 'text-white' : 'text-slate-500')} />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && pendingCount > 0 && (
                            <span
                              className={cn(
                                'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                                active ? 'bg-white text-[#0F2557]' : 'bg-rose-500 text-white'
                              )}
                            >
                              {pendingCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="border-t border-slate-200 p-3">
                <p className="mb-2 truncate px-3 text-xs text-slate-500">{displayName}</p>
                <SignOutButton action={logoutAction} variant="outline" size="sm" className="w-full justify-center">
                  Sign out
                </SignOutButton>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <span className="truncate text-sm font-semibold text-slate-900">
          {activeItem?.label ?? 'Admin'}
        </span>
      </div>

      <SignOutButton action={logoutAction} variant="ghost" size="sm">Sign out</SignOutButton>
    </header>
  );
}
