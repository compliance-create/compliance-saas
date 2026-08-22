import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser, hasModuleAccess } from '@/lib/auth-helpers';
import { ArrowRight, FileSignature, Users, Landmark } from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  FileSignature,
  Landmark,
};

export default async function ModulesPage() {
  const user = await requireUser();
  const modules = await prisma.module.findMany({
    where: { enabled: true },
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { items: true } } },
  });
  const accessMap = await Promise.all(
    modules.map(async (m) => [m.slug, await hasModuleAccess(user.id, m.slug)] as const),
  );
  const access = Object.fromEntries(accessMap);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">合规模块</h1>
        <p className="mt-1 text-sm text-slate-600">
          每个模块都提供: 审核清单 · 自动底稿 · 高管摘要 · 量化报告
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {modules.map((m) => {
          const Icon = ICONS[m.iconName ?? 'ShieldCheck'] ?? Users;
          const has = access[m.slug];
          return (
            <div key={m.id} className="card p-6 flex flex-col">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{m.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500">{m._count.items} 项审核点</span>
                {has ? (
                  <Link href={`/dashboard/modules/${m.slug}`} className="btn-primary">
                    开始审核 <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link href="/dashboard/billing" className="btn-secondary">
                    升级订阅
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
