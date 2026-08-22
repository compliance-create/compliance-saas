import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { generateSummaryDocx, saveDocxToPublic } from '@/lib/doc-generator';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const report = await prisma.report.findUnique({
    where: { id },
    include: { run: { include: { answers: { include: { item: true } } } }, module: true },
  });
  if (!report || report.userId !== user.id)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ report });
}

// 下载为 docx
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const report = await prisma.report.findUnique({
    where: { id },
    include: { run: { include: { answers: { include: { item: true } } } }, module: true, user: true },
  });
  if (!report || report.userId !== user.id)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // 整理 sections
  type DocItem = {
    title: string;
    riskLevel: string;
    keyPoints: string;
    legalBasis: string;
    answer: string;
    impactCents?: number;
    impactNarrative?: string;
  };
  const byChapter: Record<string, { chapterTitle: string; items: DocItem[] }> = {};
  for (const ans of report.run.answers) {
    const ch = ans.item.chapter;
    if (!byChapter[ch]) byChapter[ch] = { chapterTitle: ans.item.chapterTitle, items: [] };
    let parsedAnswer: Record<string, unknown> = {};
    try {
      parsedAnswer = JSON.parse(ans.answerJson);
    } catch {
      parsedAnswer = {};
    }
    const answerText =
      parsedAnswer.compliant === true
        ? '✅ 合规'
        : parsedAnswer.compliant === false
          ? `❌ 不合规: ${String(parsedAnswer.note ?? '未说明')}`
          : String(parsedAnswer.note ?? '未填写');
    byChapter[ch].items.push({
      title: ans.item.title,
      riskLevel: ans.item.riskLevel,
      keyPoints: ans.item.keyPoints,
      legalBasis: safeJson<string[]>(ans.item.legalBasis, []).join('; '),
      answer: answerText,
      impactCents: ans.impactCents ?? undefined,
      impactNarrative: ans.impactNarrative ?? undefined,
    });
  }
  const sections = Object.entries(byChapter)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => ({ chapterTitle: v.chapterTitle, items: v.items }));

  const summary = report.summaryJson ? safeJson<{ summary?: { breakdown?: unknown[] } }>(report.summaryJson, {}) : {};
  const bullets = [
    `本报告共识别 ${report.highRiskCount} 项高风险 / ${report.midRiskCount} 项中风险 / ${report.lowRiskCount} 项低风险事项。`,
    `按《行业分析方法论》折算, 年化现金流损失约 ¥${(report.totalImpactCents / 100).toLocaleString()}, 占公司年度净利润约 ${(report.profitImpactPct! * 100).toFixed(2)}%。`,
    `建议在 30 日内组建 HR/法务/工会合规专项小组, 完成高风险事项的责任分配与整改计划。`,
    `本平台支持按月更新底稿, 可作为年度合规自查、IPO/投融资尽调、突发争议复盘的留档。`,
  ];

  const buffer = await generateSummaryDocx({
    title: `${report.module.name} · 高管摘要`,
    subtitle: `——基于《行业分析方法论》量化呈现`,
    companyName: report.user.companyName ?? report.user.name ?? '委托方',
    moduleName: report.module.name,
    rating: report.rating as 'RED' | 'YELLOW' | 'GREEN',
    generatedAt: report.generatedAt,
    totals: {
      totalImpactCents: report.totalImpactCents,
      revenueImpactPct: report.revenueImpactPct ?? 0,
      profitImpactPct: report.profitImpactPct ?? 0,
      high: report.highRiskCount,
      mid: report.midRiskCount,
      low: report.lowRiskCount,
    },
    sections,
    summaryBullets: bullets,
    aiAdvice: (() => {
      try {
        const s = report.summaryJson ? JSON.parse(report.summaryJson) : null;
        return s?.aiAdvice;
      } catch {
        return undefined;
      }
    })(),
  });
  const filename = `${report.module.slug}_summary_${report.id.slice(-8)}_${Date.now()}.docx`;
  const url = await saveDocxToPublic(buffer, filename);
  // 记录
  await prisma.document.create({
    data: {
      userId: user.id,
      reportId: report.id,
      docType: 'SUMMARY',
      format: 'DOCX',
      storageKey: url,
      sizeBytes: buffer.length,
    },
  });
  return NextResponse.json({ ok: true, url });
}

function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
