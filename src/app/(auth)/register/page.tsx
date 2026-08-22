'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    companyName: '',
    industryCode: 'general',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error?.formErrors?.[0] ?? '注册失败');
      setLoading(false);
      return;
    }
    // 自动登录
    const r2 = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    if (r2?.error) {
      setError('注册成功, 自动登录失败, 请手动登录');
      router.push('/login');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md card p-8">
        <h1 className="text-2xl font-semibold text-slate-900">免费试用 7 天</h1>
        <p className="mt-1 text-sm text-slate-500">无需信用卡, 立即拿到劳动+合同模块全部能力</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">邮箱</label>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">密码(≥ 8 位)</label>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
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
          {error && <div className="text-sm text-risk-high">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '注册中...' : '注册并开始试用'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          已有账号?{' '}
          <Link href="/login" className="text-brand-600 hover:underline">
            登录
          </Link>
        </div>
      </div>
    </main>
  );
}
