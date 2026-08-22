import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, getActiveSubscription } from '@/lib/auth-helpers';

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const list = await prisma.module.findMany({
    where: { enabled: true },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      iconName: true,
      orderIndex: true,
    },
  });
  return NextResponse.json({ modules: list });
}
