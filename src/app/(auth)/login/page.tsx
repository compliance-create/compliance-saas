'use client';
import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get('callbackUrl') ?? '/dashboard';
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('登录失败: 邮箱或密码错误');
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="w-full max-w-md card p-8">
      <h1 className="text-2xl font-semibold text-slate-900">登录</h1>
      <p className="mt-1 text-sm text-slate-500">
        演示账号已预填: <code>demo@example.com</code> / <code>demo1234</code>
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">邮箱</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">密码</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-sm text-risk-high">{error}</div>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <div className="mt-4 text-center text-sm">
        没有账号?{' '}
        <Link href="/register" className="text-brand-600 hover:underline">
          免费试用
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Suspense fallback={<div className="text-slate-400">加载中…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
