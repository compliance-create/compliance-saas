import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { subscriptions: true, auditRuns: true } } },
  });
  return NextResponse.json({ users });
}
