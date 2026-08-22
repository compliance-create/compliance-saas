import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, hasModuleAccess } from '@/lib/auth-helpers';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const access = await hasModuleAccess(user.id, slug);
  if (!access) {
    return NextResponse.json({ error: 'no_subscription' }, { status: 402 });
  }
  const module = await prisma.module.findUnique({ where: { slug } });
  if (!module) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const items = await prisma.checklistItem.findMany({
    where: { moduleId: module.id },
    orderBy: [{ chapter: 'asc' }, { orderIndex: 'asc' }],
    select: {
      id: true,
      chapter: true,
      chapterTitle: true,
      orderIndex: true,
      title: true,
      keyPoints: true,
      legalBasis: true,
      riskLevel: true,
      impactKey: true,
      answerSchema: true,
    },
  });
  return NextResponse.json({
    module: {
      id: module.id,
      slug: module.slug,
      name: module.name,
      description: module.description,
      category: module.category,
    },
    items: items.map((it) => ({
      ...it,
      legalBasis: safeJson(it.legalBasis, []),
      answerSchema: safeJson(it.answerSchema, {}),
    })),
  });
}

function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
