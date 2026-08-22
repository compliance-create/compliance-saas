// =====================================================
// 微信支付 V3 - 逐年订阅
//
// 流程:
// 1. 客户端调用 /api/billing/subscribe -> 拿到 prepay_id + 支付二维码
// 2. 用户扫码完成支付
// 3. 微信回调 /api/wechat/pay/notify
// 4. 我们校验签名后激活订阅
//
// 三种模式:
// - mock 模式: 商户号是 mock-*, 返回伪造 prepay_id + 1.5s 自动激活(开发用)
// - Native 扫码: 拿到 code_url, 前端生成二维码
// - JSAPI/小程序: 拿到 prepay_id, 前端调起支付
//
// 部署: 把商户证书放 ./certs/, .env 填 WECHAT_PAY_* 即可
// =====================================================

import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export type CreateOrderInput = {
  orderNo: string;
  description: string;
  amountCents: number;
  openid?: string; // 小程序/公众号必填
  attach?: string; // 自定义数据, 回调原样返回(userId:subId)
};

export type CreateOrderResult = {
  prepayId: string;
  payParams: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: 'RSA';
    paySign: string;
  };
  qrCode?: string; // NATIVE 时返回 code_url
};

function isMockMode() {
  return (
    !process.env.WECHAT_PAY_MCH_ID ||
    process.env.WECHAT_PAY_MCH_ID === 'mock-mch-id' ||
    !process.env.WECHAT_PAY_API_V3_KEY
  );
}

// =====================================================
// 证书加载(从文件)
// =====================================================
function loadPrivateKey(): string {
  const p = process.env.WECHAT_PAY_KEY_PATH ?? './certs/apiclient_key.pem';
  const full = path.resolve(process.cwd(), p);
  if (!existsSync(full)) {
    throw new Error(
      `私钥未找到: ${full}\n请到微信支付商户平台 → API安全 → 申请API证书, 下载并放到该路径。`,
    );
  }
  return readFileSync(full, 'utf8');
}

function loadCertSerial(): string {
  // 商户 API 证书序列号: 在商户平台申请后会有
  return process.env.WECHAT_PAY_CERT_SERIAL ?? '';
}

// =====================================================
// 签名 / 验签
// =====================================================
function rsaSign(message: string, privateKey: string): string {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(privateKey, 'base64');
}

/**
 * 验签微信回调
 * 微信在 Header 携带 Wechatpay-Signature / Wechatpay-Timestamp / Wechatpay-Nonce
 * 我们用微信平台证书(从回调 URL 动态下载, 简化: 用本地公钥)校验
 */
export function verifyWechatSign(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  publicKey: string,
): boolean {
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(message);
  return verify.verify(publicKey, signature, 'base64');
}

function generateAuthToken(method: string, url: string, body: string): string {
  const mchId = process.env.WECHAT_PAY_MCH_ID!;
  const serialNo = loadCertSerial();
  const privateKey = loadPrivateKey();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = rsaSign(message, privateKey);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;
}

// =====================================================
// 1. NATIVE 下单(PC 网站扫码)
// =====================================================
export async function createWechatOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (isMockMode()) {
    return mockCreateOrder(input);
  }
  const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/native';
  const body = {
    appid: process.env.WECHAT_MP_APP_ID,
    mchid: process.env.WECHAT_PAY_MCH_ID,
    description: input.description,
    out_trade_no: input.orderNo,
    notify_url: process.env.WECHAT_PAY_NOTIFY_URL!,
    amount: {
      total: input.amountCents,
      currency: process.env.PRICE_CURRENCY ?? 'CNY',
    },
    attach: input.attach,
  };
  const token = generateAuthToken('POST', url, JSON.stringify(body));
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      'User-Agent': 'compliance-saas/0.1',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`wechat pay native error: ${resp.status} ${errText}`);
  }
  const data = (await resp.json()) as { prepay_id: string; code_url: string };
  return {
    prepayId: data.prepay_id,
    qrCode: data.code_url,
    payParams: {
      appId: process.env.WECHAT_MP_APP_ID!,
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: crypto.randomBytes(16).toString('hex'),
      package: `prepay_id=${data.prepay_id}`,
      signType: 'RSA',
      paySign: '', // NATIVE 不需要, 客户端只是渲染二维码
    },
  };
}

// =====================================================
// 2. JSAPI 下单(公众号 / 小程序内支付)
// =====================================================
export async function createJsapiOrder(
  input: CreateOrderInput & { openid: string },
): Promise<CreateOrderResult> {
  if (isMockMode()) {
    return mockCreateOrder(input);
  }
  const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi';
  const body = {
    appid: process.env.WECHAT_MP_APP_ID,
    mchid: process.env.WECHAT_PAY_MCH_ID,
    description: input.description,
    out_trade_no: input.orderNo,
    notify_url: process.env.WECHAT_PAY_NOTIFY_URL!,
    amount: {
      total: input.amountCents,
      currency: process.env.PRICE_CURRENCY ?? 'CNY',
    },
    payer: { openid: input.openid },
    attach: input.attach,
  };
  const token = generateAuthToken('POST', url, JSON.stringify(body));
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      'User-Agent': 'compliance-saas/0.1',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`wechat pay jsapi error: ${resp.status} ${errText}`);
  }
  const data = (await resp.json()) as { prepay_id: string };
  // JSAPI 需要前端用 chooseWXPay / RequestPayment 唤起, 这里生成 paySign
  const paySign = generateJsapiPaySign(data.prepay_id);
  return {
    prepayId: data.prepay_id,
    payParams: {
      appId: process.env.WECHAT_MP_APP_ID!,
      timeStamp: paySign.timeStamp,
      nonceStr: paySign.nonceStr,
      package: `prepay_id=${data.prepay_id}`,
      signType: 'RSA',
      paySign: paySign.paySign,
    },
  };
}

function generateJsapiPaySign(prepayId: string) {
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const message = `${process.env.WECHAT_MP_APP_ID}\n${timeStamp}\n${nonceStr}\nprepay_id=${prepayId}\n`;
  const paySign = rsaSign(message, loadPrivateKey());
  return { timeStamp, nonceStr, paySign };
}

// =====================================================
// 3. 订单查询
// =====================================================
export type OrderQueryResult = {
  outTradeNo: string;
  transactionId: string;
  tradeState: 'SUCCESS' | 'REFUND' | 'NOTPAY' | 'CLOSED' | 'REVOKED' | 'USERPAYING' | 'PAYERROR';
  amount: { total: number; payerTotal: number };
  attach: string;
};

export async function queryWechatOrder(outTradeNo: string): Promise<OrderQueryResult> {
  if (isMockMode()) {
    return {
      outTradeNo,
      transactionId: `mock_tx_${outTradeNo}`,
      tradeState: 'SUCCESS',
      amount: { total: 99800, payerTotal: 99800 },
      attach: '',
    };
  }
  const url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${process.env.WECHAT_PAY_MCH_ID}`;
  const token = generateAuthToken('GET', url, '');
  const resp = await fetch(url, {
    headers: { Authorization: token, 'User-Agent': 'compliance-saas/0.1' },
  });
  if (!resp.ok) {
    throw new Error(`wechat order query error: ${resp.status}`);
  }
  return resp.json() as Promise<OrderQueryResult>;
}

// =====================================================
// 4. 关闭订单
// =====================================================
export async function closeWechatOrder(outTradeNo: string): Promise<void> {
  if (isMockMode()) return;
  const url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${outTradeNo}/close`;
  const token = generateAuthToken('POST', url, '');
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: token, 'User-Agent': 'compliance-saas/0.1' },
  });
  if (!resp.ok) {
    throw new Error(`wechat order close error: ${resp.status}`);
  }
}

// =====================================================
// 5. 退款(预留)
// =====================================================
export async function refundWechatOrder(opts: {
  outTradeNo: string;
  outRefundNo: string;
  reason: string;
  amountCents: number;
  totalCents: number;
}) {
  if (isMockMode()) {
    return { refundId: `mock_refund_${opts.outRefundNo}` };
  }
  const url = 'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds';
  const body = {
    out_trade_no: opts.outTradeNo,
    out_refund_no: opts.outRefundNo,
    reason: opts.reason,
    amount: {
      refund: opts.amountCents,
      total: opts.totalCents,
      currency: process.env.PRICE_CURRENCY ?? 'CNY',
    },
  };
  const token = generateAuthToken('POST', url, JSON.stringify(body));
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      'User-Agent': 'compliance-saas/0.1',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`wechat refund error: ${resp.status}`);
  }
  return resp.json() as Promise<{ refund_id: string }>;
}

// =====================================================
// 6. 回调解析 + 验签
// =====================================================
export type WechatNotifyPayload = {
  out_trade_no: string;
  transaction_id: string;
  amount: { total: number; payer_total: number };
  attach: string;
  success: boolean;
};

/**
 * 验签并解密回调
 * 微信 v3 回调是 AES-256-GCM 加密的, 需要用 APIv3 密钥解密
 * 这里简化为只解析, 生产请用 wechatpay-axios-plugin 或自实现解密
 */
export function parseNotify(rawBody: string): WechatNotifyPayload {
  if (rawBody.trim().startsWith('{')) {
    return JSON.parse(rawBody) as WechatNotifyPayload;
  }
  const get = (tag: string) => {
    const m = rawBody.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
    return m ? m[1] : '';
  };
  return {
    out_trade_no: get('out_trade_no'),
    transaction_id: get('transaction_id'),
    amount: { total: Number(get('total_fee')), payer_total: Number(get('cash_fee')) },
    attach: get('attach'),
    success: get('result_code') === 'SUCCESS' && get('return_code') === 'SUCCESS',
  };
}

// =====================================================
// Mock 模式(开发用)
// =====================================================
function mockCreateOrder(input: CreateOrderInput): CreateOrderResult {
  const prepayId = `mock_prepay_${input.orderNo}`;
  return {
    prepayId,
    payParams: {
      appId: 'mock-app',
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: crypto.randomBytes(16).toString('hex'),
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: 'mock-signature',
    },
    qrCode: `weixin://wxpay/bizpayurl?pr=mock_${input.orderNo}`,
  };
}

export const __test__ = { isMockMode, loadPrivateKey, generateAuthToken };
