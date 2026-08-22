// POST /api/ai/interpret
// 审核页每条审核点的 "AI 解读" 按钮
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chat, LLMUnavailableError } from '@/lib/llm';
import { interpretItemPrompt } from '@/lib/prompts';
import { requireUser } from '@/lib/auth-helpers';

const schema = z.object({
  title: z.string(),
  keyPoints: z.string(),
  legalBasis: z.array(z.string()),
  riskLevel: z.string(),
  answer: z.record(z.string(), z.unknown()),
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
  const prompt = interpretItemPrompt({
    title: parsed.data.title,
    keyPoints: parsed.data.keyPoints,
    legalBasis: parsed.data.legalBasis,
    riskLevel: parsed.data.riskLevel,
    userAnswer: parsed.data.answer,
  });
  try {
    const text = await chat(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      { temperature: 0.5, maxTokens: 600 },
    );
    return NextResponse.json({ ok: true, text, userId: user.id });
  } catch (e) {
    if (e instanceof LLMUnavailableError) {
      return NextResponse.json({ error: e.message, code: 'llm_unavailable' }, { status: 503 });
    }
    console.error('ai interpret error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI 调用失败' },
      { status: 500 },
    );
  }
}
