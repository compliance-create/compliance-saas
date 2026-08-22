import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { formatCents, pct } from '@/lib/utils';
import { DownloadButton } from '@/components/modules/DownloadButton';
import { AiReportAdvice } from '@/components/modules/AiReportAdvice';
import { AskAiAboutReport } from '@/components/modules/AskAiAboutReport';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      run: { include: { answers: { include: { item: true } } } },
      module: true,
      user: true,
    },
  });
  if (!report || report.userId !== user.id) notFound();

  const sorted = [...report.run.answers].sort((a, b) => {
    const c = Number(a.item.chapter) - Number(b.item.chapter);
    return c !== 0 ? c : a.item.orderIndex - b.item.orderIndex;
  });

  const topImpacts = [...report.run.answers]
    .filter((a) => (a.impactCents ?? 0) > 0)
    .sort((a, b) => (b.impactCents ?? 0) - (a.impactCents ?? 0))
    .slice(0, 5);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href={`/dashboard/modules/${report.module.slug}`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← 返回模块
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {report.module.name} · 高管摘要
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            报告日期: {report.generatedAt.toISOString().slice(0, 10)} · 委托方:{' '}
            {report.user.companyName ?? report.user.name}
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <AskAiAboutReport
            reportSummary={{
              moduleName: report.module.name,
              totalImpactCents: report.totalImpactCents,
              highRiskCount: report.highRiskCount,
              midRiskCount: report.midRiskCount,
              lowRiskCount: report.lowRiskCount,
              rating: report.rating,
              revenueImpactPct: report.revenueImpactPct ?? 0,
              profitImpactPct: report.profitImpactPct ?? 0,
            }}
            topItems={topImpacts.map((a) => ({
              title: a.item.title,
              riskLevel: a.item.riskLevel,
              impactCents: a.impactCents ?? 0,
            }))}
          />
          <DownloadButton reportId={report.id} />
        </div>
      </div>

      {/* 总体评级 */}
      <div className="card p-6 text-center">
        <div
          className={
            report.rating === 'RED'
              ? 'inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-red-700'
              : report.rating === 'YELLOW'
                ? 'inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-amber-700'
                : 'inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-emerald-700'
          }
        >
          <span className="text-2xl">
            {report.rating === 'RED' ? '🔴' : report.rating === 'YELLOW' ? '🟡' : '🟢'}
          </span>
          <span className="text-lg font-semibold">
            {report.rating === 'RED'
              ? '高风险 · 建议立即整改'
              : report.rating === 'YELLOW'
                ? '中风险 · 修改后通过'
                : '低风险 · 可通过'}
          </span>
        </div>
      </div>

      {/* 量化结论 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="年化现金流损失" value={formatCents(report.totalImpactCents)} tone="high" />
        <Metric label="占营收比" value={pct(report.revenueImpactPct ?? 0)} />
        <Metric label="占净利比" value={pct(report.profitImpactPct ?? 0)} tone="high" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="高风险项" value={String(report.highRiskCount)} tone="high" />
        <Metric label="中风险项" value={String(report.midRiskCount)} tone="mid" />
        <Metric label="低风险项" value={String(report.lowRiskCount)} tone="low" />
      </div>

      {topImpacts.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold">Top 5 量化影响</h2>
          <div className="mt-3 space-y-3">
            {topImpacts.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between border-b border-slate-100 pb-2 last:border-0"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.item.title}</div>
                  <div className="text-xs text-slate-500">{a.impactNarrative}</div>
                </div>
                <div className="ml-4 text-right">
                  <div className="font-semibold text-risk-high">
                    {formatCents(a.impactCents ?? 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 战略建议 */}
      <AiReportAdvice
        reportId={report.id}
        initialAdvice={
          (() => {
            try {
              const s = report.summaryJson ? JSON.parse(report.summaryJson) : null;
              return s?.aiAdvice ?? null;
            } catch {
              return null;
            }
          })()
        }
      />

      {/* 详细审核 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold">详细审核</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3">章节</th>
                <th className="py-2 pr-3">风险</th>
                <th className="py-2 pr-3">事项</th>
                <th className="py-2 pr-3">现场</th>
                <th className="py-2 pr-3 text-right">量化</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-xs text-slate-500">第 {a.item.chapter} 章</td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        a.item.riskLevel === 'HIGH'
                          ? 'badge-high'
                          : a.item.riskLevel === 'MID'
                            ? 'badge-mid'
                            : 'badge-low'
                      }
                    >
                      {a.item.riskLevel === 'HIGH' ? '高' : a.item.riskLevel === 'MID' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{a.item.title}</td>
                  <td className="py-2 pr-3 text-xs text-slate-600 max-w-xs truncate">
                    {(() => {
                      try {
                        const v = JSON.parse(a.answerJson) as Record<string, unknown>;
                        if (v.compliant === true) return '✅ 合规';
                        if (v.compliant === false) return `❌ ${v.note ?? '不合规'}`;
                        return '—';
                      } catch {
                        return '—';
                      }
                    })()}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium">
                    {a.impactCents ? (
                      <span className="text-risk-high">{formatCents(a.impactCents)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        本摘要由 合规 SaaS 平台基于《行业分析方法论》自动生成 · 详细审核记录见《合规审核底稿》
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'high' | 'mid' | 'low';
}) {
  const toneClass =
    tone === 'high' ? 'text-risk-high' : tone === 'mid' ? 'text-amber-600' : tone === 'low' ? 'text-emerald-600' : '';
  return (
    <div className="card p-5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
