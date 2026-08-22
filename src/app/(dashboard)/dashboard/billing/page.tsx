import Link from 'next/link';
import { requireUser, getActiveSubscription } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { SubscribeButton } from '@/components/modules/SubscribeButton';

export default async function BillingPage() {
  const user = await requireUser();
  const sub = await getActiveSubscription(user.id);
  const allSubs = await prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: 'desc' },
    take: 10,
  });
  const price = Number(process.env.PRICE_ANNUAL_CNY ?? 99800);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">订阅与账单</h1>
        <p className="mt-1 text-sm text-slate-600">按年订阅, 包年含劳动+合同两个模块</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-slate-500">当前订阅</div>
            {sub ? (
              <>
                <div className="mt-1 text-xl font-semibold">
                  {sub.planCode === 'TRIAL' ? '免费试用' : '小微企业包年'} · {sub.status}
                </div>
                <div className="text-sm text-slate-500">
                  到期时间: {sub.expiresAt.toISOString().slice(0, 10)}
                </div>
              </>
            ) : (
              <div className="mt-1 text-xl font-semibold text-slate-700">未订阅</div>
            )}
          </div>
          <SubscribeButton amountCents={price} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">历史记录</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2">订单号</th>
              <th className="py-2">套餐</th>
              <th className="py-2">状态</th>
              <th className="py-2">金额</th>
              <th className="py-2">开始</th>
              <th className="py-2">到期</th>
            </tr>
          </thead>
          <tbody>
            {allSubs.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs">{s.wechatOrderNo ?? '—'}</td>
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
                <td className="py-2 text-xs">
                  {s.startedAt.toISOString().slice(0, 10)}
                </td>
                <td className="py-2 text-xs">{s.expiresAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {allSubs.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">还没有账单记录</p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        开发模式下支付为 mock, 点击"立即支付"后系统会自动激活订阅。生产环境请配置 WECHAT_PAY_* 环境变量。
      </p>
    </div>
  );
}
