'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SubscribeButton({ amountCents }: { amountCents: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<{ orderNo: string; qrCode?: string; prepayId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startPay() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/billing/subscribe', { method: 'POST' });
    const j = await res.json();
    setLoading(false);
    if (j.error) {
      setError(j.error);
      return;
    }
    setInfo(j);
    // mock 模式: 自动确认支付
    if (j.prepayId?.startsWith('mock_')) {
      setTimeout(async () => {
        await fetch('/api/wechat/pay/notify', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNo: j.orderNo }),
        });
        router.refresh();
        setInfo(null);
        alert('支付成功! 订阅已激活');
      }, 1500);
    }
  }

  if (info) {
    return (
      <div className="text-sm">
        <div className="text-slate-700">订单已创建: {info.orderNo}</div>
        <div className="text-xs text-slate-500 mt-1">
          {info.prepayId?.startsWith('mock_')
            ? '🧪 mock 模式: 1.5 秒后自动激活...'
            : '请使用微信扫描下方二维码完成支付'}
        </div>
        {info.qrCode && !info.prepayId?.startsWith('mock_') && (
          <div className="mt-2 text-xs text-slate-400 break-all">{info.qrCode}</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={startPay} className="btn-primary" disabled={loading}>
        {loading ? '创建订单...' : `立即支付 ¥${(amountCents / 100).toLocaleString()} / 年`}
      </button>
      {error && <div className="text-xs text-risk-high">{error}</div>}
    </div>
  );
}
