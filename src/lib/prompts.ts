// =====================================================
// 提示词模板(全部基于《行业分析方法论》和中国法律实务)
//
// 设计原则:
// 1. 输出短小精悍(< 250 字), 用户在小屏幕上能扫读
// 2. 用老板/HR 听得懂的语言, 避免堆砌法条
// 3. 给出可执行的下一步
// 4. 标注"本回答不构成法律意见"的兜底
// =====================================================

import { buildLegalCorpusPrompt } from './legal-corpus';

const BASE_SYSTEM = `你是一个面向中国小微企业的合规顾问, 语气专业但通俗。
回答必须:
- 短小精悍(中文 200 字以内)
- 用口语化表达, 老板/HR 听得懂
- 给出 1-3 条可执行建议
- 末尾注明"以上不构成个案法律意见"`;

// 解读单条审核点
export function interpretItemPrompt(input: {
  title: string;
  keyPoints: string;
  legalBasis: string[];
  riskLevel: string;
  userAnswer: Record<string, unknown>;
}) {
  const ans = JSON.stringify(input.userAnswer, null, 2);
  const laws = input.legalBasis.join(' / ');
  return {
    system: BASE_SYSTEM,
    user: `请用 200 字内, 给小微企业老板讲清楚下面这条合规事项, 并根据用户的回答给具体建议。

【审核事项】${input.title}
【审核要点】${input.keyPoints}
【风险等级】${input.riskLevel}
【法律依据】${laws}
【用户当前回答】
${ans}

请按以下结构输出(每条 1-2 句):
1. 一句话讲清这条法规保护什么
2. 结合用户回答指出当前的风险点
3. 1-2 步具体怎么改`,
  };
}

// 自由问答(基础版, 不带法条库)
export function chatPrompt(input: {
  question: string;
  context?: {
    moduleName?: string;
    companyName?: string;
    industryCode?: string;
    revenueCents?: number;
    headcount?: number;
  };
}) {
  const ctx = input.context
    ? `用户公司: ${input.context.companyName ?? '未填'} (行业: ${input.context.industryCode ?? '通用'}/员工: ${input.context.headcount ?? '?'}人/年营收: ${input.context.revenueCents ? (input.context.revenueCents / 100).toLocaleString() : '?'}元)`
    : '';
  return {
    system: `你是合规 SaaS 平台的智能助手, 帮小微企业老板解答劳动/合同/税务等合规问题。${BASE_SYSTEM}`,
    user: `${ctx ? `【上下文】\n${ctx}\n` : ''}【用户问题】${input.question}

要求:
- 如果用户问具体合规问题, 给出法条 + 实操建议
- 如果用户问"我该不该做 X", 给出"如果做"和"如果不做"两种结果
- 涉及金额/期限的, 给出具体数字
- 涉及法律意见的, 提醒用户咨询律师`,
  };
}

// 自由问答 - 带法条 RAG(精选法条库进 system prompt, 由 retrieveRelevantLaws 选最相关的)

export function chatPromptWithRag(
  input: {
    question: string;
    context?: {
      moduleName?: string;
      companyName?: string;
      industryCode?: string;
      revenueCents?: number;
      headcount?: number;
    };
  },
  relevantLaws: import('./legal-corpus').LegalEntry[] = [],
) {
  const ctx = input.context
    ? `用户公司: ${input.context.companyName ?? '未填'} (行业: ${input.context.industryCode ?? '通用'}/员工: ${input.context.headcount ?? '?'}人/年营收: ${input.context.revenueCents ? (input.context.revenueCents / 100).toLocaleString() : '?'}元)`
    : '';
  return {
    system: `你是合规 SaaS 平台的智能助手, 帮小微企业老板解答劳动/合同/税务等合规问题。${BASE_SYSTEM}
${buildLegalCorpusPrompt(relevantLaws)}

${ctx ? `【上下文】\n${ctx}\n` : ''}
【用户问题】${input.question}

要求:
- **每次回答都必须**用【法律名称-第xx条】格式引用至少 1 条相关法条 (例: 【劳动合同法-第47条】)
  - 禁止用《xxx》第xx条 这种散文式引用, 平台会把【】里的内容渲染成可点击的法条 chip
- 如果没有精确匹配, 引用相关法条并说明"具体以执业律师意见为准"
- 如果用户问"我该不该做 X", 给出"如果做"和"如果不做"两种结果
- 涉及金额/期限的, 给出具体数字
- 涉及法律意见的, 提醒用户咨询律师`,
    user: input.question,
  };
}

// AI 报告增强(在高管摘要后面加一段战略建议)
export function reportEnhancePrompt(input: {
  moduleName: string;
  high: number;
  mid: number;
  low: number;
  totalImpactCents: number;
  revenueImpactPct: number;
  profitImpactPct: number;
  topItems: Array<{ title: string; impactCents: number; riskLevel: string }>;
}) {
  return {
    system: BASE_SYSTEM,
    user: `请基于以下合规报告数据, 写一段 250 字内的"AI 战略建议", 给到小微企业老板/CEO。

【报告模块】${input.moduleName}
【风险分布】高 ${input.high} / 中 ${input.mid} / 低 ${input.low}
【年化现金流损失】¥${(input.totalImpactCents / 100).toLocaleString()}
【占营收比】${(input.revenueImpactPct * 100).toFixed(2)}% / 【占净利比】${(input.profitImpactPct * 100).toFixed(2)}%
【Top 风险】
${input.topItems.map((t, i) => `${i + 1}. ${t.title} (${t.riskLevel}) ¥${(t.impactCents / 100).toLocaleString()}`).join('\n')}

请输出:
1. 一句话总评(风险/机会)
2. 应该最先改的 1-2 件事
3. 什么时候改(本周/月/季度)
4. 不改的话后果(从营收/利润角度)`,
  };
}
