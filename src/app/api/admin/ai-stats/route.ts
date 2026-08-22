// GET /api/admin/ai-stats
// AI 用量统计: 聊天次数 / 合同审阅次数 / 报告增强次数 / 法条 RAG 触发次数
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days') ?? 30);
  const since = new Date(Date.now() - days * 86400 * 1000);

  const [chatMessages, contractReviews, reports, users, activeUsers] = await Promise.all([
    prisma.aiChatMessage.count({ where: { role: 'user', createdAt: { gte: since } } }),
    prisma.contractReview.count({ where: { createdAt: { gte: since } } }),
    prisma.report.count({ where: { generatedAt: { gte: since } } }),
    prisma.user.count(),
    prisma.user.count({
      where: { aiConversations: { some: { updatedAt: { gte: since } } } },
    }),
  ]);

  // Top 5 高频问题(从 chat user 消息提取)
  const topQuestions = await prisma.aiChatMessage.groupBy({
    by: ['content'],
    where: { role: 'user', createdAt: { gte: since } },
    _count: { content: true },
    orderBy: { _count: { content: 'desc' } },
    take: 5,
  });

  // 每日用量
  const dailyMap = new Map<string, { chats: number; reviews: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400 * 1000);
    dailyMap.set(d.toISOString().slice(0, 10), { chats: 0, reviews: 0 });
  }
  // chats
  const recentChats = await prisma.aiChatMessage.findMany({
    where: { role: 'user', createdAt: { gte: since } },
    select: { createdAt: true },
  });
  for (const c of recentChats) {
    const k = c.createdAt.toISOString().slice(0, 10);
    const e = dailyMap.get(k);
    if (e) e.chats++;
  }
  // reviews
  const recentReviews = await prisma.contractReview.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  for (const r of recentReviews) {
    const k = r.createdAt.toISOString().slice(0, 10);
    const e = dailyMap.get(k);
    if (e) e.reviews++;
  }
  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    totals: {
      chatMessages,
      contractReviews,
      reports,
      totalUsers: users,
      activeUsers,
    },
    topQuestions: topQuestions.map((q) => ({
      question: q.content.slice(0, 50),
      count: q._count.content,
    })),
    daily,
  });
}
