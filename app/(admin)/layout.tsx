import Link from 'next/link';
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
} from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminLogoutAction } from '@/app/(public)/admin-login/actions';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { getPendingApprovalsCount } from '@/lib/cache/admin-cache';
import { AdminMobileNav } from './AdminMobileNav';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/approvals', label: 'Approvals', icon: UserCheck, badge: true },
  { href: '/admin/alumni', label: 'Alumni', icon: Users },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/forum', label: 'Forum', icon: MessageSquare },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [adminAccess, pendingCount] = await Promise.all([
    requireAdminAccess(),
    getPendingApprovalsCount(),
  ]);

  return (
    <div className="flex min-h-dvh min-w-0">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <Logo />
          <Badge variant="primary" className="ml-auto text-[10px]">Admin</Badge>
        </div>
        <nav className="flex-1 px-3 py-2" aria-label="Admin navigation">
          <ul className="space-y-1">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <item.icon className="h-4 w-4 text-slate-500" />
                  {item.label}
                  {item.badge && pendingCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="mb-2 truncate px-3 text-xs text-slate-500">{adminAccess.displayName}</p>
          <form action={adminLogoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header with slide-out drawer navigation */}
        <AdminMobileNav
          displayName={adminAccess.displayName}
          pendingCount={pendingCount}
          logoutAction={adminLogoutAction}
        />

        <main id="main" className="min-w-0 flex-1 overflow-x-hidden bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
