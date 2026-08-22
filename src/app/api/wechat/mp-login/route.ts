import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { code2Session } from '@/lib/wechat-mp';

const schema = z.object({
  code: z.string(),
  isMini: z.boolean().default(true),
});

// 微信小程序 / 公众号登录: 换 openid -> 找/建账号 -> 返回 token
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const { code, isMini } = parsed.data;
  const session = await code2Session(code, isMini);
  if (!session.openid) return NextResponse.json({ error: 'wechat_failed' }, { status: 502 });

  // 找或建用户
  const where = isMini ? { miniOpenid: session.openid } : { wechatOpenid: session.openid };
  let user = await prisma.user.findFirst({ where });
  if (!user) {
    const openid = session.openid;
    user = await prisma.user.create({
      data: {
        email: `${openid}@wechat.placeholder`,
        name: '微信用户',
        ...(isMini ? { miniOpenid: openid } : { wechatOpenid: openid }),
        wechatUnionid: session.unionid,
        password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
        role: 'USER',
        subscriptions: {
          create: {
            planCode: 'TRIAL',
            status: 'ACTIVE',
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
            paidAmountCents: 0,
            includedModulesJson: JSON.stringify(['labour', 'contract']),
          },
        },
      },
    });
  }
  // 返回一个简化的 token(实际生产用 JWT, 这里用伪 token, 前端带这个去走 NextAuth credentials 流程)
  return NextResponse.json({
    userId: user.id,
    openid: session.openid,
    token: `${user.id}.${crypto.randomBytes(8).toString('hex')}`,
  });
}
