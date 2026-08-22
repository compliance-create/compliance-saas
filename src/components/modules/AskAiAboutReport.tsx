'use client';
import { Sparkles } from 'lucide-react';

type ReportSummary = {
  moduleName: string;
  totalImpactCents: number;
  highRiskCount: number;
  midRiskCount: number;
  lowRiskCount: number;
  rating: string;
  revenueImpactPct: number;
  profitImpactPct: number;
};

type TopItem = {
  title: string;
  riskLevel: string;
  impactCents: number;
};

export function AskAiAboutReport({
  reportSummary,
  topItems,
}: {
  reportSummary: ReportSummary;
  topItems: TopItem[];
}) {
  function onClick() {
    const topTitles = topItems
      .slice(0, 3)
      .map((t, i) => `${i + 1}. ${t.title} (${t.riskLevel}, ¥${(t.impactCents / 100).toLocaleString()})`)
      .join('\n');

    const prefill = `我刚生成的 "${reportSummary.moduleName}" 合规报告情况:
- 整体评级: ${reportSummary.rating}
- 风险分布: 高 ${reportSummary.highRiskCount} / 中 ${reportSummary.midRiskCount} / 低 ${reportSummary.lowRiskCount}
- 年化现金流损失: ¥${(reportSummary.totalImpactCents / 100).toLocaleString()}
- 占营收比: ${(reportSummary.revenueImpactPct * 100).toFixed(2)}%
- 占净利比: ${(reportSummary.profitImpactPct * 100).toFixed(2)}%
- Top 风险:
${topTitles}

请基于这份报告, 帮我:
1. 哪些是本周就该改的(成本最低/影响最大)
2. 整改的具体步骤
3. 怎么向老板/股东汇报这个数据`;

    // 触发 AI 浮窗: 1) 打开 2) 预填
    window.dispatchEvent(
      new CustomEvent('ai-chat:open-and-fill', { detail: { prefill } }),
    );
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
      title="基于此报告问 AI"
    >
      <Sparkles className="h-4 w-4" />
      问 AI 关于此报告
    </button>
  );
}
