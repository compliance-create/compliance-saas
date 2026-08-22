import { prisma } from '@/lib/prisma';
import { ModuleToggle } from '@/components/admin/ModuleToggle';

export default async function AdminModules() {
  const modules = await prisma.module.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { items: true, auditRuns: true, reports: true } } },
  });
  return (
    <div className="p-6 md:p-8 space-y-4">
      <h1 className="text-2xl font-semibold">模块管理</h1>
      <p className="text-sm text-slate-500">
        启用 / 停用模块。 未来新增的税法/数据合规/知识产权模块都会在这里出现。
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {modules.map((m) => (
          <div key={m.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{m.description}</p>
              </div>
              <ModuleToggle id={m.id} enabled={m.enabled} />
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {m._count.items} 项审核点 · {m._count.auditRuns} 次审核 · {m._count.reports} 份报告
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
