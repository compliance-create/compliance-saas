'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewAuditForm({ moduleSlug }: { moduleSlug: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    revenueCents: 50000000, // 50 万
    grossMargin: 0.4,
    headcount: 10,
    avgSalaryCents: 800000, // 8000
    industryCode: 'general',
    companyName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleSlug, ...form }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error?.formErrors?.[0] ?? '启动失败');
      setLoading(false);
      return;
    }
    const j = await res.json();
    router.push(`/dashboard/audit/${j.runId}`);
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold">启动一次新审核</h2>
      <p className="mt-1 text-sm text-slate-600">
        先填写公司基本信息, 量化引擎会基于《行业分析方法论》把每一项风险折算到你的营收/利润。
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label">公司名称(可选)</label>
          <input
            className="input"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </div>
        <div>
          <label className="label">行业代码</label>
          <select
            className="input"
            value={form.industryCode}
            onChange={(e) => setForm({ ...form, industryCode: e.target.value })}
          >
            <option value="general">通用 / 服务 / 零售</option>
            <option value="manufacturing">制造业</option>
            <option value="construction">建筑/工程</option>
            <option value="tech">互联网/科技</option>
            <option value="food">餐饮/食品</option>
          </select>
        </div>
        <div>
          <label className="label">年营收(元)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={form.revenueCents / 100}
            onChange={(e) => setForm({ ...form, revenueCents: Number(e.target.value) * 100 })}
          />
        </div>
        <div>
          <label className="label">毛利率(0~1)</label>
          <input
            className="input"
            type="number"
            step={0.05}
            min={0}
            max={1}
            value={form.grossMargin}
            onChange={(e) => setForm({ ...form, grossMargin: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">员工数(人)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={form.headcount}
            onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">平均月薪(元)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={form.avgSalaryCents / 100}
            onChange={(e) => setForm({ ...form, avgSalaryCents: Number(e.target.value) * 100 })}
          />
        </div>
        {error && <div className="md:col-span-2 text-sm text-risk-high">{error}</div>}
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '启动中...' : '开始审核'}
          </button>
        </div>
      </form>
    </div>
  );
}
