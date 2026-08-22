import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser, hasModuleAccess } from '@/lib/auth-helpers';
import { NewAuditForm } from '@/components/modules/NewAuditForm';

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const access = await hasModuleAccess(user.id, slug);
  if (!access) redirect('/dashboard/billing');

  const module = await prisma.module.findUnique({ where: { slug } });
  if (!module) notFound();

  const [items, recentReports] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { moduleId: module.id },
      orderBy: [{ chapter: 'asc' }, { orderIndex: 'asc' }],
    }),
    prisma.report.findMany({
      where: { userId: user.id, moduleId: module.id },
      orderBy: { generatedAt: 'desc' },
      take: 5,
    }),
  ]);
  const high = items.filter((i) => i.riskLevel === 'HIGH').length;
  const mid = items.filter((i) => i.riskLevel === 'MID').length;
  const low = items.filter((i) => i.riskLevel === 'LOW').length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/modules" className="text-sm text-slate-500 hover:text-slate-700">
            ← 返回模块列表
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{module.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{module.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="总审核点" value={items.length} />
        <Stat label="高风险" value={high} tone="high" />
        <Stat label="中风险" value={mid} tone="mid" />
        <Stat label="低风险" value={low} tone="low" />
      </div>

      <NewAuditForm moduleSlug={slug} />

      {slug === 'contract' && (
        <>
          <div className="card p-6 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">AI 智能审阅合同</h2>
                <p className="mt-1 text-sm text-slate-600">
                  把合同粘贴进来, AI 帮你识别风险点、缺失条款、给整改建议 (5-30 秒出结果)。
                </p>
                <div className="mt-3 flex gap-2">
                  <Link href="/ai/contract-review" className="btn-primary">
                    <Sparkles className="h-4 w-4" />
                    单份审阅
                  </Link>
                  <Link href="/batch-review" className="btn-secondary">
                    批量审阅(最多 10 份)
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {recentReports.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold">历史报告</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {recentReports.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/report/${r.id}`}
                className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded"
              >
                <div className="text-sm">{r.generatedAt.toLocaleString('zh-CN')}</div>
                <div
                  className={
                    r.rating === 'RED'
                      ? 'text-risk-high font-semibold'
                      : r.rating === 'YELLOW'
                        ? 'text-amber-600 font-semibold'
                        : 'text-emerald-600 font-semibold'
                  }
                >
                  {r.rating} · 损失 ¥{(r.totalImpactCents / 100).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'high' | 'mid' | 'low' }) {
  const toneClass =
    tone === 'high' ? 'text-risk-high' : tone === 'mid' ? 'text-amber-600' : tone === 'low' ? 'text-emerald-600' : '';
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
