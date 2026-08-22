import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import {
  computeImpact,
  deriveAssumptions,
  summarizeRun,
} from '@/lib/impact-engine';

const answerSchema = z.object({
  answers: z.array(
    z.object({
      itemId: z.string(),
      answer: z.record(z.string(), z.unknown()),
    }),
  ),
  complete: z.boolean().default(false),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const run = await prisma.auditRun.findUnique({ where: { id } });
  if (!run || run.userId !== user.id)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // 1. 存每条回答 + 即时计算 impact
  const items = await prisma.checklistItem.findMany({
    where: { moduleId: run.moduleId },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const assumption = deriveAssumptions({
    revenueCents: run.revenueCents ?? 0,
    grossMargin: run.grossMargin ?? 0.4,
    headcount: run.headcount ?? 0,
    avgSalaryCents: 0, // 后面从 assumption 表取
    industryCode: run.industryCode ?? 'general',
  });
  // 拿真实平均工资
  const stored = await prisma.industryAssumption.findFirst({ where: { userId: user.id } });
  if (stored) assumption.avgSalaryCents = stored.avgSalaryCents;

  for (const a of parsed.data.answers) {
    const item = itemMap.get(a.itemId);
    if (!item) continue;
    const result = computeImpact(
      item.impactKey,
      item.riskLevel as 'HIGH' | 'MID' | 'LOW',
      assumption,
      a.answer as Record<string, unknown>,
    );
    await prisma.auditAnswer.upsert({
      where: { runId_itemId: { runId: run.id, itemId: item.id } },
      update: {
        answerJson: JSON.stringify(a.answer),
        impactCents: result.impactCents,
        impactNarrative: result.narrative,
        computedAt: new Date(),
      },
      create: {
        runId: run.id,
        itemId: item.id,
        answerJson: JSON.stringify(a.answer),
        impactCents: result.impactCents,
        impactNarrative: result.narrative,
        computedAt: new Date(),
      },
    });
  }

  // 2. 如果 complete=true, 汇总 + 生成 Report
  if (parsed.data.complete) {
    const allAnswers = await prisma.auditAnswer.findMany({ where: { runId: run.id } });
    const summary = summarizeRun({
      assumption,
      items: allAnswers
        .map((a) => {
          const item = itemMap.get(a.itemId);
          if (!item) return null;
          return {
            impactKey: item.impactKey,
            riskLevel: item.riskLevel as 'HIGH' | 'MID' | 'LOW',
            answer: safeJson(a.answerJson, {}),
          };
        })
        .filter(Boolean) as never,
    });
    const rating: 'RED' | 'YELLOW' | 'GREEN' =
      summary.totalImpactCents > assumption.estimatedNetProfitCents * 0.05
        ? 'RED'
        : summary.totalImpactCents > assumption.estimatedNetProfitCents * 0.01
          ? 'YELLOW'
          : 'GREEN';
    const report = await prisma.report.upsert({
      where: { runId: run.id },
      update: {
        summaryJson: JSON.stringify({ summary }),
        totalImpactCents: summary.totalImpactCents,
        highRiskCount: summary.highRiskCount,
        midRiskCount: summary.midRiskCount,
        lowRiskCount: summary.lowRiskCount,
        revenueImpactPct: summary.revenueImpactPct,
        profitImpactPct: summary.profitImpactPct,
        rating,
        generatedAt: new Date(),
      },
      create: {
        userId: user.id,
        runId: run.id,
        moduleId: run.moduleId,
        summaryJson: JSON.stringify({ summary }),
        totalImpactCents: summary.totalImpactCents,
        highRiskCount: summary.highRiskCount,
        midRiskCount: summary.midRiskCount,
        lowRiskCount: summary.lowRiskCount,
        revenueImpactPct: summary.revenueImpactPct,
        profitImpactPct: summary.profitImpactPct,
        rating,
      },
    });
    await prisma.auditRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return NextResponse.json({ ok: true, reportId: report.id, rating, summary });
  }

  return NextResponse.json({ ok: true, savedCount: parsed.data.answers.length });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const run = await prisma.auditRun.findUnique({
    where: { id },
    include: { answers: true, report: true, module: true },
  });
  if (!run || run.userId !== user.id)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ run });
}

function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
