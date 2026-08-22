// POST /api/ai/chat - 自由问答, 自动持久化到数据库
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chat, LLMUnavailableError } from '@/lib/llm';
import { chatPromptWithRag } from '@/lib/prompts';
import { retrieveRelevantLaws } from '@/lib/legal-corpus';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  question: z.string().min(1).max(1000),
  conversationId: z.string().optional(), // 续接已有对话
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(20)
    .optional(),
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

  // 上下文: 公司信息 + 最近报告
  const [assumption, latestReport] = await Promise.all([
    prisma.industryAssumption.findFirst({ where: { userId: user.id } }),
    prisma.report.findFirst({
      where: { userId: user.id },
      orderBy: { generatedAt: 'desc' },
      include: { module: true },
    }),
  ]);
  const ctx = {
    companyName: user.companyName ?? undefined,
    industryCode: user.industryCode ?? undefined,
    revenueCents: assumption?.revenueCents,
    headcount: assumption?.headcount,
    moduleName: latestReport?.module.name,
  };

  // 1. 找/建 conversation
  let convId = parsed.data.conversationId;
  let conv;
  if (convId) {
    conv = await prisma.aiConversation.findUnique({ where: { id: convId } });
    if (!conv || conv.userId !== user.id) {
      return NextResponse.json({ error: 'conversation_not_found' }, { status: 404 });
    }
  } else {
    // 新对话, title = 首条问题前 30 字
    const title = parsed.data.question.slice(0, 30).replace(/\n/g, ' ');
    conv = await prisma.aiConversation.create({
      data: { userId: user.id, title },
    });
    convId = conv.id;
  }

  // 2. 存 user 消息
  await prisma.aiChatMessage.create({
    data: {
      conversationId: convId,
      role: 'user',
      content: parsed.data.question,
    },
  });

  // 3. 调 LLM (有上下文 + RAG 法条库)
  const relevantLaws = await retrieveRelevantLaws(parsed.data.question, 5);
  const prompt = chatPromptWithRag(
    { question: parsed.data.question, context: ctx },
    relevantLaws,
  );
  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: prompt.system },
    ];
    if (parsed.data.history) {
      for (const h of parsed.data.history) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: 'user', content: prompt.user });
    const text = await chat(messages, { temperature: 0.7, maxTokens: 800 });

    // 4. 存 assistant 消息
    await prisma.aiChatMessage.create({
      data: { conversationId: convId, role: 'assistant', content: text },
    });
    // 5. 更新 conversation.updatedAt
    await prisma.aiConversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, text, conversationId: convId });
  } catch (e) {
    if (e instanceof LLMUnavailableError) {
      return NextResponse.json({ error: e.message, code: 'llm_unavailable' }, { status: 503 });
    }
    console.error('ai chat error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI 调用失败' },
      { status: 500 },
    );
  }
}
