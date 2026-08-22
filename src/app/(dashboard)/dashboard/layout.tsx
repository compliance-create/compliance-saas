import { ReactNode } from 'react';
import Link from 'next/link';
import { LayoutDashboard, FileSignature, Users, Receipt, FileText, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { requireUser, getActiveSubscription } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { AiChatWidget } from '@/components/layout/AiChatWidget';

const nav = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/dashboard/modules', label: '合规模块', icon: ShieldCheck },
  { href: '/dashboard/documents', label: '我的文档', icon: FileText },
  { href: '/dashboard/billing', label: '订阅与账单', icon: Receipt },
  { href: '/dashboard/settings', label: '设置', icon: Settings },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const sub = await getActiveSubscription(user.id);
  const daysLeft = sub ? Math.max(0, Math.ceil((sub.expiresAt.getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="px-6 py-5 border-b border-slate-200">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <span className="font-semibold">合规 SaaS</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
          {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
            <Link
              href="/admin"
              className="mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-brand-700 hover:bg-brand-50"
            >
              <Users className="h-4 w-4" />
              管理后台
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 text-xs text-slate-500">
            <div className="font-medium text-slate-700">{user.name ?? user.email}</div>
            <div className="mt-1">{user.companyName ?? '未设置公司'}</div>
            {sub && (
              <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                {sub.planCode} · {daysLeft} 天剩余
              </div>
            )}
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <span className="font-semibold">合规 SaaS</span>
          </Link>
          <SignOutButton />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* 全局 AI 助手浮窗 */}
      <AiChatWidget />
    </div>
  );
}
