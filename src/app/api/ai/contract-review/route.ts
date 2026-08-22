// POST /api/ai/contract-review
// 合同 AI 审阅: 用户粘贴合同文本, LLM 抽取结构化风险 + 给出建议
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chat, LLMUnavailableError } from '@/lib/llm';
import { contractReviewPrompt } from '@/lib/contract-review-prompt';
import { requireUser } from '@/lib/auth-helpers';

const schema = z.object({
  contractName: z.string().max(200).optional(),
  counterparty: z.string().max(200).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  contractText: z.string().min(50).max(20000),
});

type ReviewJson = {
  summary: {
    counterpartyType: string;
    contractType: string;
    keyTerms: string;
    overallRating: 'RED' | 'YELLOW' | 'GREEN';
  };
  risks: Array<{
    category: string;
    title: string;
    severity: 'HIGH' | 'MID' | 'LOW';
    description: string;
    suggestion: string;
  }>;
  missedClauses: string[];
  bottomLine: string;
};

function safeParseReviewJson(raw: string): ReviewJson | null {
  // 尝试直接 parse
  try {
    return JSON.parse(raw) as ReviewJson;
  } catch {
    // 尝试从 markdown 代码块里提取
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) {
      try {
        return JSON.parse(m[1]) as ReviewJson;
      } catch {
        // ignore
      }
    }
    // 尝试找第一个 { 到最后一个 }
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1)) as ReviewJson;
      } catch {
        // ignore
      }
    }
    return null;
  }
}

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
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const prompt = contractReviewPrompt(parsed.data);
  try {
    const raw = await chat(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      { temperature: 0.4, maxTokens: 2500 },
    );
    const review = safeParseReviewJson(raw);
    if (!review) {
      return NextResponse.json(
        { error: 'AI 输出无法解析为 JSON', raw },
        { status: 502 },
      );
    }
    // 用 impact-engine 估算量化影响(粗略)
    const riskWeights = { HIGH: 1, MID: 0.5, LOW: 0.25 };
    const baseAmount = parsed.data.amountCents ?? 1000000; // 默认 1 万
    const estimatedImpactCents = review.risks.reduce((sum, r) => {
      const w = riskWeights[r.severity] ?? 0.1;
      return sum + Math.round(baseAmount * 0.05 * w);
    }, 0);
    return NextResponse.json({
      ok: true,
      review,
      estimatedImpactCents,
    });
  } catch (e) {
    if (e instanceof LLMUnavailableError) {
      return NextResponse.json({ error: e.message, code: 'llm_unavailable' }, { status: 503 });
    }
    console.error('ai contract-review error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI 调用失败' },
      { status: 500 },
    );
  }
}
