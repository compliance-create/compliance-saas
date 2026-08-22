import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const modules = await prisma.module.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { items: true, auditRuns: true, reports: true } } },
  });
  return NextResponse.json({ modules });
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = (await req.json()) as { id: string; enabled?: boolean; description?: string };
  const updated = await prisma.module.update({
    where: { id: body.id },
    data: {
      enabled: body.enabled,
      description: body.description,
    },
  });
  return NextResponse.json({ module: updated });
}
