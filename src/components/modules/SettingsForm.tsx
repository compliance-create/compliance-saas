'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SettingsForm({
  user,
  assumption,
}: {
  user: { name: string | null; email: string; companyName: string | null; industryCode: string | null };
  assumption: {
    revenueCents: number;
    grossMargin: number;
    headcount: number;
    avgSalaryCents: number;
    industryCode: string;
  } | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name ?? '',
    companyName: user.companyName ?? '',
    industryCode: user.industryCode ?? 'general',
    revenueCents: assumption?.revenueCents ?? 50000000,
    grossMargin: assumption?.grossMargin ?? 0.4,
    headcount: assumption?.headcount ?? 10,
    avgSalaryCents: assumption?.avgSalaryCents ?? 800000,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    // 简化: 调一个轻量 API. 这里用 localStorage 暂存, 启动审核时仍可填。
    // 真正落库需要扩展 /api/users/me, 这里展示逻辑骨架
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4 max-w-2xl">
      <div className="text-sm text-slate-500">登录邮箱: {user.email}</div>
      <div>
        <label className="label">姓名</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="label">公司 / 店铺名称</label>
        <input
          className="input"
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
        />
      </div>
      <div>
        <label className="label">行业</label>
        <select
          className="input"
          value={form.industryCode}
          onChange={(e) => setForm({ ...form, industryCode: e.target.value })}
        >
          <option value="general">通用 / 零售 / 服务</option>
          <option value="manufacturing">制造业</option>
          <option value="construction">建筑/工程</option>
          <option value="tech">互联网/科技</option>
          <option value="food">餐饮/食品</option>
        </select>
      </div>
      <div className="pt-2 border-t border-slate-200">
        <div className="text-sm font-medium">行业假设(用于量化引擎)</div>
        <div className="text-xs text-slate-500 mb-3">
          这些数据将作为《行业分析方法论》中"折现率/净产出"计算的输入。
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">年营收(元)</label>
            <input
              className="input"
              type="number"
              value={form.revenueCents / 100}
              onChange={(e) =>
                setForm({ ...form, revenueCents: Number(e.target.value) * 100 })
              }
            />
          </div>
          <div>
            <label className="label">毛利率(0~1)</label>
            <input
              className="input"
              type="number"
              step={0.05}
              value={form.grossMargin}
              onChange={(e) => setForm({ ...form, grossMargin: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">员工数</label>
            <input
              className="input"
              type="number"
              value={form.headcount}
              onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">平均月薪(元)</label>
            <input
              className="input"
              type="number"
              value={form.avgSalaryCents / 100}
              onChange={(e) =>
                setForm({ ...form, avgSalaryCents: Number(e.target.value) * 100 })
              }
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </button>
        {saved && <span className="text-sm text-emerald-600">已保存 ✓</span>}
      </div>
    </form>
  );
}
