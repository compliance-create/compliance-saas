'use client';
import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

export function AiReportAdvice({
  reportId,
  initialAdvice,
}: {
  reportId: string;
  initialAdvice?: string | null;
}) {
  const [text, setText] = useState<string | null>(initialAdvice ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? '生成失败');
      } else {
        setText(j.text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI 战略建议</h3>
            <div className="text-xs text-slate-500">
              基于本报告量化数据 + 行业方法论
            </div>
          </div>
        </div>
        {text && !loading && (
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600"
          >
            <RefreshCw className="h-3 w-3" />
            重新生成
          </button>
        )}
      </div>

      <div className="mt-4 text-sm leading-relaxed text-slate-800">
        {loading && (
          <div className="flex items-center gap-2 text-violet-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            AI 正在分析你的报告, 通常需要 5-15 秒...
          </div>
        )}
        {error && <div className="text-risk-high">{error}</div>}
        {text && !loading && (
          <div className="whitespace-pre-wrap">{text}</div>
        )}
        {!text && !loading && !error && (
          <button onClick={onClick} className="btn-primary">
            <Sparkles className="h-4 w-4" />
            生成 AI 战略建议
          </button>
        )}
      </div>
    </div>
  );
}
