// GET /api/ai/chat/list - 列历史对话
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const convs = await prisma.aiConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json({ conversations: convs });
}
