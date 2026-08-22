import { prisma } from '@/lib/prisma';

export default async function AdminSubscriptions() {
  const subs = await prisma.subscription.findMany({
    orderBy: { startedAt: 'desc' },
    take: 100,
    include: { user: true },
  });
  return (
    <div className="p-6 md:p-8 space-y-4">
      <h1 className="text-2xl font-semibold">订阅管理</h1>
      <div className="card p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2">用户</th>
              <th className="py-2">套餐</th>
              <th className="py-2">状态</th>
              <th className="py-2">金额</th>
              <th className="py-2">开始</th>
              <th className="py-2">到期</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="py-2">
                  <div>{s.user.name}</div>
                  <div className="text-xs text-slate-500">{s.user.email}</div>
                </td>
                <td className="py-2">{s.planCode}</td>
                <td className="py-2">
                  <span
                    className={
                      s.status === 'ACTIVE'
                        ? 'badge-low'
                        : s.status === 'PENDING'
                          ? 'badge-mid'
                          : 'badge-high'
                    }
                  >
                    {s.status}
                  </span>
                </td>
                <td className="py-2">¥{((s.paidAmountCents ?? 0) / 100).toLocaleString()}</td>
                <td className="py-2 text-xs">{s.startedAt.toISOString().slice(0, 10)}</td>
                <td className="py-2 text-xs">{s.expiresAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
