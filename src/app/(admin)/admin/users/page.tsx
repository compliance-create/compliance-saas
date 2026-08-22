import { prisma } from '@/lib/prisma';

export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { subscriptions: true, auditRuns: true } } },
  });
  return (
    <div className="p-6 md:p-8 space-y-4">
      <h1 className="text-2xl font-semibold">用户管理</h1>
      <div className="card p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2">邮箱</th>
              <th className="py-2">姓名</th>
              <th className="py-2">公司</th>
              <th className="py-2">角色</th>
              <th className="py-2">订阅</th>
              <th className="py-2">审核</th>
              <th className="py-2">注册时间</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs">{u.email}</td>
                <td className="py-2">{u.name}</td>
                <td className="py-2">{u.companyName ?? '—'}</td>
                <td className="py-2">{u.role}</td>
                <td className="py-2">{u._count.subscriptions}</td>
                <td className="py-2">{u._count.auditRuns}</td>
                <td className="py-2 text-xs">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
