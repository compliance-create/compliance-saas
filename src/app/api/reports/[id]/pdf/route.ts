// PDF 导出 - POST /api/reports/[id]/pdf
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { generateReportPdf, savePdfToPublic } from '@/lib/pdf-report';

// 与 docx 路由共享同一份数据组装
async function loadReportData(reportId: string, userId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      run: { include: { answers: { include: { item: true } } } },
      module: true,
      user: true,
    },
  });
  if (!report || report.userId !== userId) return null;
  return report;
}

function safeArr(s: string | null): string[] {
  if (!s) return [];
  try {
    return JSON.parse(s) as string[];
  } catch {
    return [];
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const report = await loadReportData(id, user.id);
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // 整理数据
  type DocItem = {
    chapter: string;
    chapterTitle: string;
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
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(ans.answerJson);
    } catch {
      parsed = {};
    }
    const answerText =
      parsed.compliant === true
        ? '✅ 合规'
        : parsed.compliant === false
          ? `❌ ${String(parsed.note ?? '不合规')}`
          : String(parsed.note ?? '未填写');
    byChapter[ch].items.push({
      chapter: ch,
      chapterTitle: ans.item.chapterTitle,
      title: ans.item.title,
      riskLevel: ans.item.riskLevel,
      keyPoints: ans.item.keyPoints,
      legalBasis: safeArr(ans.item.legalBasis).join('; '),
      answer: answerText,
      impactCents: ans.impactCents ?? undefined,
      impactNarrative: ans.impactNarrative ?? undefined,
    });
  }
  const sections = Object.entries(byChapter)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => ({ chapterTitle: v.chapterTitle, items: v.items }));

  const bullets = [
    `本报告共识别 ${report.highRiskCount} 项高风险 / ${report.midRiskCount} 项中风险 / ${report.lowRiskCount} 项低风险事项。`,
    `按《行业分析方法论》折算, 年化现金流损失约 ¥${(report.totalImpactCents / 100).toLocaleString()}, 占公司年度净利润约 ${((report.profitImpactPct ?? 0) * 100).toFixed(2)}%。`,
    `建议在 30 日内组建 HR/法务/工会合规专项小组, 完成高风险事项的责任分配与整改计划。`,
    `本平台支持按月更新底稿, 可作为年度合规自查、IPO/投融资尽调、突发争议复盘的留档。`,
  ];

  const buffer = await generateReportPdf({
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

  const filename = `${report.module.slug}_summary_${report.id.slice(-8)}_${Date.now()}.pdf`;
  const url = await savePdfToPublic(buffer, filename);
  await prisma.document.create({
    data: {
      userId: user.id,
      reportId: report.id,
      docType: 'SUMMARY',
      format: 'PDF',
      storageKey: url,
      sizeBytes: buffer.length,
    },
  });
  return NextResponse.json({ ok: true, url, sizeBytes: buffer.length });
}
