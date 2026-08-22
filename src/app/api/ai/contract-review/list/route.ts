// GET /api/ai/contract-review/list
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const batchId = url.searchParams.get('batchId');
  const reviews = await prisma.contractReview.findMany({
    where: { userId: user.id, ...(batchId ? { batchId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ reviews });
}
