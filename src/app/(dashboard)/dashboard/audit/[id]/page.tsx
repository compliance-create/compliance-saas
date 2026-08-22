import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { deriveAssumptions } from '@/lib/impact-engine';
import { AuditRunner } from '@/components/modules/AuditRunner';

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const run = await prisma.auditRun.findUnique({
    where: { id },
    include: {
      module: true,
      answers: true,
    },
  });
  if (!run || run.userId !== user.id) notFound();
  if (run.status === 'COMPLETED' && run.answers.length > 0) {
    const report = await prisma.report.findUnique({ where: { runId: run.id } });
    if (report) redirect(`/dashboard/report/${report.id}`);
  }

  const items = await prisma.checklistItem.findMany({
    where: { moduleId: run.moduleId },
    orderBy: [{ chapter: 'asc' }, { orderIndex: 'asc' }],
  });

  // 准备初始答案
  const initialAnswers: Record<string, Record<string, unknown>> = {};
  for (const a of run.answers) {
    try {
      initialAnswers[a.itemId] = JSON.parse(a.answerJson);
    } catch {
      // ignore
    }
  }

  // 准备行业假设
  const stored = await prisma.industryAssumption.findFirst({ where: { userId: user.id } });
  const assumption = deriveAssumptions({
    revenueCents: run.revenueCents ?? 0,
    grossMargin: run.grossMargin ?? 0.4,
    headcount: run.headcount ?? 0,
    avgSalaryCents: stored?.avgSalaryCents ?? 800000,
    industryCode: run.industryCode ?? 'general',
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <Link
          href={`/dashboard/modules/${run.module.slug}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← 返回模块
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{run.module.name} · 审核进行中</h1>
        <p className="mt-1 text-sm text-slate-600">
          共 {items.length} 项, 已答 {run.answers.length} 项
        </p>
      </div>

      <AuditRunner
        runId={run.id}
        items={items.map((it) => ({
          id: it.id,
          chapter: it.chapter,
          chapterTitle: it.chapterTitle,
          orderIndex: it.orderIndex,
          title: it.title,
          keyPoints: it.keyPoints,
          legalBasis: safeArr(it.legalBasis),
          riskLevel: it.riskLevel as 'HIGH' | 'MID' | 'LOW',
          answerSchema: safeObj(it.answerSchema),
        }))}
        initialAnswers={initialAnswers}
        assumption={{
          revenueCents: assumption.revenueCents,
          grossMargin: assumption.grossMargin,
          headcount: assumption.headcount,
          avgSalaryCents: assumption.avgSalaryCents,
          estimatedGrossProfitCents: assumption.estimatedGrossProfitCents,
          estimatedNetProfitCents: assumption.estimatedNetProfitCents,
        }}
      />
    </div>
  );
}

function safeArr(s: string | null): string[] {
  if (!s) return [];
  try {
    return JSON.parse(s) as string[];
  } catch {
    return [];
  }
}
function safeObj(s: string | null): Record<string, unknown> {
  if (!s) return {};
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}
