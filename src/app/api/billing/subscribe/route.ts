import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { createWechatOrder } from '@/lib/wechat-pay';

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const amount = Number(process.env.PRICE_ANNUAL_CNY ?? 99800); // 分
  const orderNo = `ANNUAL_${user.id.slice(-6)}_${Date.now()}_${crypto
    .randomBytes(3)
    .toString('hex')}`;

  // 先创建订阅记录(PENDING)
  const sub = await prisma.subscription.create({
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

  // 调微信支付
  const order = await createWechatOrder({
    orderNo,
    description: '合规 SaaS 年订阅(含劳动+合同模块)',
    amountCents: amount,
    attach: `${user.id}:${sub.id}`,
  });

  return NextResponse.json({
    orderNo,
    subId: sub.id,
    prepayId: order.prepayId,
    qrCode: order.qrCode,
    payParams: order.payParams,
    amountCents: amount,
  });
}
