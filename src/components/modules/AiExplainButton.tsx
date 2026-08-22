'use client';
import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';

export function AiExplainButton({
  title,
  keyPoints,
  legalBasis,
  riskLevel,
  answer,
}: {
  title: string;
  keyPoints: string;
  legalBasis: string[];
  riskLevel: string;
  answer: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (text || loading) {
      setOpen(!open);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, keyPoints, legalBasis, riskLevel, answer }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? 'AI 解读失败');
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
    <div className="mt-3">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90"
      >
        <Sparkles className="h-3 w-3" />
        AI 解读
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-violet-200 bg-violet-50/60 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {loading && (
                <div className="flex items-center gap-2 text-violet-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  AI 正在解读...
                </div>
              )}
              {error && <div className="text-risk-high">{error}</div>}
              {text && (
                <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                  {text}
                </div>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
