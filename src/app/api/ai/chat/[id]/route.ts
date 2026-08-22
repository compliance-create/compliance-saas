// GET /api/ai/chat/[id] - 拿某个对话的全部消息
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const conv = await prisma.aiConversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });
  if (!conv || conv.userId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ conversation: conv });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const conv = await prisma.aiConversation.findUnique({ where: { id } });
  if (!conv || conv.userId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  await prisma.aiConversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
