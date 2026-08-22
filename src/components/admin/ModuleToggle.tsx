'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ModuleToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(enabled);
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    setV(!v);
    await fetch('/api/admin/modules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled: !v }),
    });
    setLoading(false);
    router.refresh();
  }
  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={
        v
          ? 'inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800'
          : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600'
      }
    >
      {v ? '已启用' : '已停用'}
    </button>
  );
}
