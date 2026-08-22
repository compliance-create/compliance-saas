import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser, hasModuleAccess } from '@/lib/auth-helpers';

const startSchema = z.object({
  moduleSlug: z.string(),
  revenueCents: z.number().int().nonnegative(),
  grossMargin: z.number().min(0).max(1),
  headcount: z.number().int().nonnegative(),
  avgSalaryCents: z.number().int().nonnegative(),
  industryCode: z.string().default('general'),
  companySnapshot: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const access = await hasModuleAccess(user.id, parsed.data.moduleSlug);
  if (!access) return NextResponse.json({ error: 'no_subscription' }, { status: 402 });
  const module = await prisma.module.findUnique({ where: { slug: parsed.data.moduleSlug } });
  if (!module) return NextResponse.json({ error: 'module_not_found' }, { status: 404 });

  const run = await prisma.auditRun.create({
    data: {
      userId: user.id,
      moduleId: module.id,
      companySnapshot: JSON.stringify(parsed.data.companySnapshot ?? {}),
      revenueCents: parsed.data.revenueCents,
      grossMargin: parsed.data.grossMargin,
      headcount: parsed.data.headcount,
      industryCode: parsed.data.industryCode,
      status: 'IN_PROGRESS',
    },
  });

  // 保存行业假设(供后续报告使用)
  await prisma.industryAssumption.upsert({
    where: { id: `${user.id}-assumption` }, // 简化: 每个用户一个
    update: {
      industryCode: parsed.data.industryCode,
      revenueCents: parsed.data.revenueCents,
      grossMargin: parsed.data.grossMargin,
      headcount: parsed.data.headcount,
      avgSalaryCents: parsed.data.avgSalaryCents,
    },
    create: {
      id: `${user.id}-assumption`,
      userId: user.id,
      industryCode: parsed.data.industryCode,
      revenueCents: parsed.data.revenueCents,
      grossMargin: parsed.data.grossMargin,
      headcount: parsed.data.headcount,
      avgSalaryCents: parsed.data.avgSalaryCents,
    },
  });

  return NextResponse.json({ runId: run.id });
}
