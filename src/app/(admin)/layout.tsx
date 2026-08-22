import { ReactNode } from 'react';
import Link from 'next/link';
import { Users, ShieldCheck, Receipt, FileText, Activity } from 'lucide-react';
import { requireAdmin } from '@/lib/auth-helpers';

const adminNav = [
  { href: '/admin', label: '概览', icon: ShieldCheck },
  { href: '/admin/users', label: '用户', icon: Users },
  { href: '/admin/modules', label: '模块', icon: FileText },
  { href: '/admin/subscriptions', label: '订阅', icon: Receipt },
  { href: '/admin/ai-stats', label: 'AI 用量', icon: Activity },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 border-r border-slate-200 bg-white">
        <div className="px-6 py-5 border-b border-slate-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <span className="font-semibold">管理后台</span>
          </Link>
        </div>
        <nav className="p-3 space-y-1">
          {adminNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
