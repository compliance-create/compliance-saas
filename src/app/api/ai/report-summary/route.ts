// POST /api/ai/report-summary
// 报告增强: 给一份已完成报告生成 AI 战略建议
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chat, LLMUnavailableError } from '@/lib/llm';
import { reportEnhancePrompt } from '@/lib/prompts';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  reportId: z.string(),
});

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const report = await prisma.report.findUnique({
    where: { id: parsed.data.reportId },
    include: {
      run: {
        include: {
          answers: {
            where: { impactCents: { gt: 0 } },
            include: { item: true },
            orderBy: { impactCents: 'desc' },
            take: 5,
          },
        },
      },
      module: true,
    },
  });
  if (!report || report.userId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const prompt = reportEnhancePrompt({
    moduleName: report.module.name,
    high: report.highRiskCount,
    mid: report.midRiskCount,
    low: report.lowRiskCount,
    totalImpactCents: report.totalImpactCents,
    revenueImpactPct: report.revenueImpactPct ?? 0,
    profitImpactPct: report.profitImpactPct ?? 0,
    topItems: report.run.answers
      .filter((a) => (a.impactCents ?? 0) > 0)
      .map((a) => ({
        title: a.item.title,
        impactCents: a.impactCents ?? 0,
        riskLevel: a.item.riskLevel,
      })),
  });

  try {
    const text = await chat(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      { temperature: 0.6, maxTokens: 800 },
    );
    // 缓存到 report.summaryJson 的 aiAdvice 字段
    let summary: Record<string, unknown> = {};
    try {
      summary = report.summaryJson ? JSON.parse(report.summaryJson) : {};
    } catch {
      // ignore
    }
    summary.aiAdvice = text;
    summary.aiAdviceAt = new Date().toISOString();
    await prisma.report.update({
      where: { id: report.id },
      data: { summaryJson: JSON.stringify(summary) },
    });
    return NextResponse.json({ ok: true, text, cached: true });
  } catch (e) {
    if (e instanceof LLMUnavailableError) {
      return NextResponse.json({ error: e.message, code: 'llm_unavailable' }, { status: 503 });
    }
    console.error('ai report-summary error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI 调用失败' },
      { status: 500 },
    );
  }
}
