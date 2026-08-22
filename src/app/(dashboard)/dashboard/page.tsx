import Link from 'next/link';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ArrowRight, FileSignature, Users, AlertTriangle } from 'lucide-react';
import { formatCents, pct } from '@/lib/utils';

export default async function DashboardOverview() {
  const user = await requireUser();
  const [recentReports, recentRuns, totalHigh] = await Promise.all([
    prisma.report.findMany({
      where: { userId: user.id },
      orderBy: { generatedAt: 'desc' },
      take: 5,
      include: { module: true },
    }),
    prisma.auditRun.findMany({
      where: { userId: user.id, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: { module: true },
    }),
    prisma.auditAnswer.count({
      where: {
        run: { userId: user.id },
        item: { riskLevel: 'HIGH' },
        impactCents: { gt: 0 },
      },
    }),
  ]);

  const totalImpact = recentReports.reduce((s, r) => s + r.totalImpactCents, 0);

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">欢迎回来, {user.name ?? user.email}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.companyName ?? '请先在「设置」里填写公司信息, 量化引擎需要这些数据。'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          icon={<AlertTriangle className="h-5 w-5 text-risk-high" />}
          label="已识别高风险项"
          value={String(totalHigh)}
        />
        <Stat
          icon={<FileSignature className="h-5 w-5 text-brand-600" />}
          label="累计报告"
          value={String(recentReports.length)}
        />
        <Stat
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          label="进行中审核"
          value={String(recentRuns.length)}
        />
      </div>

      {recentReports.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold">量化累计影响</h2>
          <div className="mt-3 text-3xl font-bold text-risk-high">
            {formatCents(totalImpact)}
          </div>
          <p className="mt-1 text-sm text-slate-500">基于已生成的报告按年化现金流口径汇总</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">最近报告</h2>
            <Link href="/dashboard/documents" className="text-sm text-brand-600">
              全部
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {recentReports.length === 0 ? (
              <p className="text-sm text-slate-500">还没有报告, 先去跑一个审核吧 →</p>
            ) : (
              recentReports.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/report/${r.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded"
                >
                  <div>
                    <div className="text-sm font-medium">{r.module.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.generatedAt.toISOString().slice(0, 10)} · {r.highRiskCount} 高 /{' '}
                      {r.midRiskCount} 中
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={
                        r.rating === 'RED'
                          ? 'text-risk-high font-semibold'
                          : r.rating === 'YELLOW'
                            ? 'text-amber-600 font-semibold'
                            : 'text-emerald-600 font-semibold'
                      }
                    >
                      {formatCents(r.totalImpactCents)}
                    </div>
                    <div className="text-xs text-slate-500">
                      占净利 {pct(r.profitImpactPct ?? 0)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">进行中的审核</h2>
            <Link href="/dashboard/modules" className="text-sm text-brand-600">
              全部模块
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {recentRuns.length === 0 ? (
              <p className="text-sm text-slate-500">没有进行中的审核</p>
            ) : (
              recentRuns.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/audit/${r.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded"
                >
                  <div>
                    <div className="text-sm font-medium">{r.module.name}</div>
                    <div className="text-xs text-slate-500">开始于 {r.startedAt.toLocaleString('zh-CN')}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-6 bg-gradient-to-r from-brand-50 to-white">
        <h3 className="text-lg font-semibold">推荐: 先从这两个模块开始</h3>
        <p className="mt-1 text-sm text-slate-600">
          基于《行业分析方法论》, 劳动 + 合同 是对小微企业现金流影响最大的两个合规模块。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/modules/labour" className="btn-primary">
            启动劳动合规审核
          </Link>
          <Link href="/dashboard/modules/contract" className="btn-secondary">
            启动合同合规审核
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
