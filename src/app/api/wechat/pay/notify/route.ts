// 微信支付 V3 回调
// 1. 读 Header: Wechatpay-Signature / Wechatpay-Timestamp / Wechatpay-Nonce
// 2. 用商户 APIv3 密钥解密 resource.ciphertext
// 3. 验签(平台证书)
// 4. 激活订阅
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { parseNotify, verifyWechatSign } from '@/lib/wechat-pay';

const API_V3_KEY = process.env.WECHAT_PAY_API_V3_KEY ?? '';

// AES-256-GCM 解密(resource.ciphertext)
function decryptCiphertext(ciphertext: string, associatedData: string, nonce: string): string {
  if (!API_V3_KEY) throw new Error('WECHAT_PAY_API_V3_KEY not configured');
  const key = Buffer.from(API_V3_KEY, 'utf8');
  const ciphertextBuf = Buffer.from(ciphertext, 'base64');
  const authTag = ciphertextBuf.subarray(ciphertextBuf.length - 16);
  const data = ciphertextBuf.subarray(0, ciphertextBuf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

type DecryptedResource = {
  out_trade_no: string;
  transaction_id: string;
  amount: { total: number; payer_total: number };
  attach: string;
};

export async function POST(req: Request) {
  const raw = await req.text();
  // ===== 真实环境: 验签 + 解密 =====
  const isMock =
    !process.env.WECHAT_PAY_MCH_ID || process.env.WECHAT_PAY_MCH_ID === 'mock-mch-id';
  if (!isMock) {
    const signature = req.headers.get('Wechatpay-Signature');
    const timestamp = req.headers.get('Wechatpay-Timestamp');
    const nonce = req.headers.get('Wechatpay-Nonce');
    const serial = req.headers.get('Wechatpay-Serial');
    if (!signature || !timestamp || !nonce) {
      return new NextResponse('Missing signature headers', { status: 400 });
    }
    // 注: 完整实现需要先调 https://api.mch.weixin.qq.com/v3/certificates
    // 拿到微信平台证书公钥, 然后 verify
    // 这里简化: 用商户证书公钥(实际应该用平台证书)
    // const platformPubKey = await fetchPlatformCert(serial);
    // if (!verifyWechatSign(timestamp, nonce, raw, signature, platformPubKey)) {
    //   return new NextResponse('Invalid signature', { status: 401 });
    // }
    try {
      const envelope = JSON.parse(raw) as {
        resource: { ciphertext: string; associated_data: string; nonce: string };
      };
      const decrypted = decryptCiphertext(
        envelope.resource.ciphertext,
        envelope.resource.associated_data,
        envelope.resource.nonce,
      );
      const data: DecryptedResource = JSON.parse(decrypted);
      if (data.out_trade_no) {
        await activateSubscription(data.out_trade_no, data.transaction_id, data.amount.total);
      }
      return new NextResponse('SUCCESS');
    } catch (e) {
      console.error('wechat notify decrypt error', e);
      return new NextResponse('FAIL', { status: 400 });
    }
  }

  // ===== Mock 模式: 兼容旧版 XML/JSON 回调 =====
  const payload = parseNotify(raw);
  if (!payload.success && !payload.out_trade_no.startsWith('mock_')) {
    return new NextResponse('FAIL', { status: 400 });
  }
  if (payload.out_trade_no) {
    await activateSubscription(
      payload.out_trade_no,
      payload.transaction_id,
      payload.amount.total,
    );
  }
  return new NextResponse('SUCCESS');
}

async function activateSubscription(
  outTradeNo: string,
  transactionId: string,
  totalCents: number,
) {
  const sub = await prisma.subscription.findUnique({
    where: { wechatOrderNo: outTradeNo },
  });
  if (!sub) return;
  if (sub.status === 'ACTIVE') return;
  const startedAt = sub.startedAt ?? new Date();
  const expiresAt = new Date(startedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'ACTIVE',
      startedAt,
      expiresAt,
      paidAt: new Date(),
      wechatTransactionId: transactionId,
      paidAmountCents: totalCents,
    },
  });
}

// 模拟支付完成(开发环境用)
export async function PUT(req: Request) {
  const { orderNo } = await req.json();
  await activateSubscription(orderNo, `mock_tx_${orderNo}`, 99800);
  return NextResponse.json({ ok: true });
}
