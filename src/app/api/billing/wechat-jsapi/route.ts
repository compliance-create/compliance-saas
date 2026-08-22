// JSAPI 下单(用于公众号 / 小程序内支付)
// 客户端调 wx.chooseWXPay({...payParams}) 直接唤起微信
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { createJsapiOrder } from '@/lib/wechat-pay';

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { openid } = (await req.json()) as { openid: string };
  if (!openid) {
    return NextResponse.json({ error: 'openid_required' }, { status: 400 });
  }
  const amount = Number(process.env.PRICE_ANNUAL_CNY ?? 99800);
  const orderNo = `JSAPI_${user.id.slice(-6)}_${Date.now()}_${crypto
    .randomBytes(3)
    .toString('hex')}`;

  await prisma.subscription.create({
    data: {
      userId: user.id,
      planCode: 'ANNUAL_PACK',
      status: 'PENDING',
      startedAt: new Date(),
      expiresAt: new Date(),
      wechatOrderNo: orderNo,
      paidAmountCents: amount,
      includedModulesJson: JSON.stringify(['labour', 'contract']),
    },
  });

  const order = await createJsapiOrder({
    orderNo,
    description: '合规 SaaS 年订阅',
    amountCents: amount,
    openid,
    attach: user.id,
  });

  return NextResponse.json({
    orderNo,
    subId: undefined,
    ...order,
  });
}
