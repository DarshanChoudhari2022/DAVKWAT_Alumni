import Link from 'next/link';
import { redirect } from 'next/navigation';
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
import { logoutAction } from '@/app/(public)/login/actions';
import { createClient } from '@/lib/supabase/server';

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // Get pending approval count for badge
  const { count: pendingCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending');

  return (
    <div className="flex min-h-dvh">
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
                  {item.badge && (pendingCount ?? 0) > 0 && (
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
          <p className="mb-2 truncate px-3 text-xs text-slate-500">{profile.full_name}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Logo />
            <Badge variant="primary" className="text-[10px]">Admin</Badge>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">Sign out</Button>
          </form>
        </header>

        {/* Mobile nav */}
        <nav className="flex overflow-x-auto border-b border-slate-200 bg-white px-2 lg:hidden" aria-label="Admin navigation">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-[#0F2557]"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <main id="main" className="flex-1 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
