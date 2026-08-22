import { prisma } from '@/lib/prisma';

export default async function AdminOverview() {
  const [userCount, moduleCount, itemCount, subCount, reportCount] = await Promise.all([
    prisma.user.count(),
    prisma.module.count(),
    prisma.checklistItem.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.report.count(),
  ]);
  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold">平台概览</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Stat label="用户" value={userCount} />
        <Stat label="模块" value={moduleCount} />
        <Stat label="审核点" value={itemCount} />
        <Stat label="活跃订阅" value={subCount} />
        <Stat label="报告" value={reportCount} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
