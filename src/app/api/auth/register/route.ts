import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少 8 位'),
  name: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  industryCode: z.string().default('general'),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, name, companyName, industryCode } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });
  }
  const hash = await bcrypt.hash(password, 10);
  // 试用: 自动创建一个 7 天的试用订阅, 含全部模块
  const trialDays = Number(process.env.TRIAL_DAYS ?? 7);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + trialDays);
  const user = await prisma.user.create({
    data: {
      email,
      name: name ?? email.split('@')[0],
      password: hash,
      companyName,
      industryCode,
      role: 'USER',
      subscriptions: {
        create: {
          planCode: 'TRIAL',
          status: 'ACTIVE',
          startedAt: new Date(),
          expiresAt,
          paidAmountCents: 0,
          includedModulesJson: JSON.stringify(['labour', 'contract']),
        },
      },
    },
  });
  return NextResponse.json({ ok: true, userId: user.id });
}
