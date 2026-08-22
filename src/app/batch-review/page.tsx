'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, FileText, ShieldCheck, ChevronLeft, Upload, X, FileUp, Image as ImageIcon, ListChecks } from 'lucide-react';
import { formatCents } from '@/lib/utils';

type Risk = {
  category: string;
  title: string;
  severity: 'HIGH' | 'MID' | 'LOW';
  description: string;
  suggestion: string;
};

type Review = {
  summary: {
    counterpartyType: string;
    contractType: string;
    keyTerms: string;
    overallRating: 'RED' | 'YELLOW' | 'GREEN';
  };
  risks: Risk[];
  missedClauses: string[];
  bottomLine: string;
};

type FileResult = {
  fileName: string;
  success: boolean;
  review?: Review;
  fileMeta?: { size: number; kind: string; pages?: number; textLength: number };
  impactCents?: number;
  error?: string;
};

type BatchSummary = {
  total: number;
  success: number;
  failed: number;
  red: number;
  yellow: number;
  green: number;
  totalImpactCents: number;
};

export default function BatchReviewPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [results, setResults] = useState<FileResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const list = Array.from(e.dataTransfer.files ?? []);
    setFiles((prev) => [...prev, ...list].slice(0, 10));
  }

  function onPick(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr].slice(0, 10));
  }

  function removeAt(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      for (const f of files) form.append('files', f);
      const r = await fetch('/api/ai/contract-review/batch', { method: 'POST', body: form });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? '批量审阅失败');
      } else {
        setBatchId(j.batchId);
        setSummary(j.summary);
        setResults(j.results);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFiles([]);
    setBatchId(null);
    setSummary(null);
    setResults([]);
    setError(null);
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <Link
          href="/ai/contract-review"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          返回单份合同审阅
        </Link>
        <h1 className="mt-2 text-2xl font-semibold flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-violet-500" />
          批量合同审阅
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          一次上传多份合同, AI 串行审阅, 输出汇总风险评估。
          单批最多 10 份, 总大小不超过 50MB。
        </p>
      </div>

      {!summary ? (
        <div className="card p-6 space-y-4">
          {!files.length ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition ${
                dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400'
              }`}
            >
              <FileUp className="mx-auto h-10 w-10 text-slate-400" />
              <div className="mt-3 text-sm text-slate-600">
                <span className="font-medium text-brand-600">点击选择</span> 或拖拽多份合同到这里
              </div>
              <div className="mt-1 text-xs text-slate-400">
                支持 .docx / .pdf / .txt / .jpg / .png 等 · 每份 ≤ 5MB · 一次 ≤ 10 份
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".docx,.doc,.pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.gif,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                className="hidden"
                onChange={(e) => onPick(e.target.files)}
              />
            </div>
          ) : (
            <>
              <div className="text-sm font-medium">已选择 {files.length} / 10 份:</div>
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                  >
                    {f.type.startsWith('image/') ? (
                      <ImageIcon className="h-5 w-5 text-slate-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-slate-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{f.name}</div>
                      <div className="text-xs text-slate-500">
                        {(f.size / 1024).toFixed(1)} KB · {f.type || '未知类型'}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAt(i)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="btn-secondary"
                >
                  <Upload className="h-4 w-4" />
                  继续添加
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onPick(e.target.files)}
                />
                <button onClick={submit} className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI 批量审阅中 (每份 5-30 秒)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      开始批量审阅
                    </>
                  )}
                </button>
              </div>
            </>
          )}
          {error && <div className="text-sm text-risk-high">{error}</div>}
        </div>
      ) : (
        <BatchResult summary={summary} results={results} batchId={batchId!} onReset={reset} />
      )}
    </div>
  );
}

function BatchResult({
  summary,
  results,
  batchId,
  onReset,
}: {
  summary: BatchSummary;
  results: FileResult[];
  batchId: string;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* 汇总卡片 */}
      <div className="card p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm text-slate-600">批量审阅汇总</div>
            <div className="mt-1 text-2xl font-bold">
              {summary.success} / {summary.total} 成功 · 总影响 {formatCents(summary.totalImpactCents)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="badge-high">🔴 红 {summary.red}</span>
              <span className="badge-mid">🟡 黄 {summary.yellow}</span>
              <span className="badge-low">🟢 绿 {summary.green}</span>
              {summary.failed > 0 && <span className="badge-high">❌ 失败 {summary.failed}</span>}
            </div>
          </div>
          <button onClick={onReset} className="btn-secondary">
            审阅新批次
          </button>
        </div>
      </div>

      {/* 每份详情 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold">审阅明细</h2>
        <div className="mt-3 space-y-3">
          {results.map((r, i) => (
            <div key={i} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.fileName}</div>
                    {r.fileMeta && (
                      <div className="text-xs text-slate-500">
                        {r.fileMeta.kind} · {r.fileMeta.textLength} 字
                        {r.fileMeta.pages ? ` · ${r.fileMeta.pages} 页` : ''}
                      </div>
                    )}
                  </div>
                </div>
                {r.success ? (
                  <div className="flex items-center gap-2">
                    {r.review?.summary.overallRating === 'RED' && (
                      <span className="badge-high">🔴 高</span>
                    )}
                    {r.review?.summary.overallRating === 'YELLOW' && (
                      <span className="badge-mid">🟡 中</span>
                    )}
                    {r.review?.summary.overallRating === 'GREEN' && (
                      <span className="badge-low">🟢 低</span>
                    )}
                    <span className="text-sm font-semibold text-risk-high">
                      {formatCents(r.impactCents ?? 0)}
                    </span>
                  </div>
                ) : (
                  <span className="badge-high">失败</span>
                )}
              </div>
              {r.error && <div className="mt-2 text-xs text-risk-high">{r.error}</div>}
              {r.success && r.review && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-800">
                    查看 {r.review.risks.length} 条风险 →
                  </summary>
                  <div className="mt-2 space-y-1 pl-2">
                    {r.review.risks.slice(0, 5).map((risk, j) => (
                      <div key={j} className="text-xs">
                        <span
                          className={
                            risk.severity === 'HIGH'
                              ? 'badge-high mr-1'
                              : risk.severity === 'MID'
                                ? 'badge-mid mr-1'
                                : 'badge-low mr-1'
                          }
                        >
                          {risk.severity === 'HIGH' ? '高' : risk.severity === 'MID' ? '中' : '低'}
                        </span>
                        <span className="text-slate-700">{risk.title}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
