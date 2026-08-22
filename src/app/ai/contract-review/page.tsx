'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, FileText, ShieldCheck, ChevronLeft, Upload, X, FileUp, Image as ImageIcon } from 'lucide-react';
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

type FileMeta = {
  name: string;
  size: number;
  type: string;
  kind: 'docx' | 'pdf' | 'text' | 'image';
  pages?: number;
  textLength: number;
};

const SAMPLE_CONTRACT = `甲方(卖方): 深圳市某科技有限公司, 统一社会信用代码: 91440300MA5DXXXXXX
乙方(买方): 张某某(自然人, 身份证: 4403xxxxxxxxxxxxxx)

甲乙双方就电子设备采购事宜, 达成如下协议:

第一条 标的
甲方向乙方提供笔记本电脑 50 台, 品牌型号 ThinkPad X1 Carbon, 单价人民币 9,800 元, 总计 490,000 元。

第二条 质量
产品符合国家标准, 验收合格后视为质量无异议。

第三条 付款
乙方应于本合同签订之日起 7 个工作日内一次性支付全部货款至甲方对公账户。

第四条 交付
甲方收到货款后 30 日内发货, 运费由甲方承担。

第五条 违约责任
任何一方违约的, 违约方应支付对方合同金额 5% 的违约金。

第六条 争议解决
因本合同发生的争议, 由双方协商解决; 协商不成的, 任一方可向深圳仲裁委员会申请仲裁。

第七条 合同生效
本合同自双方签字之日起生效, 一式两份, 双方各执一份。

甲方: 深圳市某科技有限公司(盖章)        乙方: 张某某(签字)
日期: 2026 年 8 月 22 日`;

type Mode = 'paste' | 'file';

export default function ContractAiReviewPage() {
  const [mode, setMode] = useState<Mode>('paste');
  const [name, setName] = useState('电子设备采购合同');
  const [counterparty, setCounterparty] = useState('深圳市某科技有限公司');
  const [amount, setAmount] = useState(490000);
  const [text, setText] = useState(SAMPLE_CONTRACT);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    review: Review;
    estimatedImpactCents: number;
    fileMeta?: FileMeta;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  function onPick(f: File | null) {
    setFile(f);
    if (f) {
      setName((n) => (n === '电子设备采购合同' ? f.name.replace(/\.[^.]+$/, '') : n));
    }
  }

  async function submitPaste(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/contract-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractName: name,
          counterparty,
          amountCents: amount * 100,
          contractText: text,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? '审阅失败');
      } else {
        setResult(j);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }

  async function submitFile() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('contractName', name);
      form.append('counterparty', counterparty);
      form.append('amountCents', String(amount * 100));
      const res = await fetch('/api/ai/contract-review/file', {
        method: 'POST',
        body: form,
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? '审阅失败');
      } else {
        setResult(j);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <Link
          href="/dashboard/modules/contract"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          返回合同模块
        </Link>
        <h1 className="mt-2 text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-violet-500" />
          AI 合同审阅
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          粘贴文本, 或上传 Word / PDF / 合同图片, AI 帮你识别风险点、缺失条款、给整改建议。
        </p>
      </div>

      {!result ? (
        <>
          {/* 模式切换 */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setMode('paste')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                mode === 'paste'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="inline h-4 w-4 mr-1.5" />
              粘贴文本
            </button>
            <button
              onClick={() => setMode('file')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                mode === 'file'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="inline h-4 w-4 mr-1.5" />
              上传文件
            </button>
          </div>

          {mode === 'paste' && (
            <form onSubmit={submitPaste} className="card p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="label">合同名称</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">对方当事人</label>
                  <input
                    className="input"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">合同金额(元)</label>
                  <input
                    className="input"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="label">合同全文(可粘贴 50-20000 字)</label>
                <textarea
                  className="input font-mono text-xs"
                  rows={16}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="mt-1 text-xs text-slate-400 text-right">{text.length} 字</div>
              </div>
              {error && <div className="text-sm text-risk-high">{error}</div>}
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI 审阅中 (5-30 秒)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      开始 AI 审阅
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {mode === 'file' && (
            <div className="card p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="label">合同名称</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">对方当事人</label>
                  <input
                    className="input"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">合同金额(元)</label>
                  <input
                    className="input"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition ${
                    dragging
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                  }`}
                >
                  <FileUp className="mx-auto h-10 w-10 text-slate-400" />
                  <div className="mt-3 text-sm text-slate-600">
                    <span className="font-medium text-brand-600">点击选择</span> 或拖拽文件到这里
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    支持: <code>.docx</code> / <code>.doc</code> / <code>.pdf</code> / <code>.txt</code> / 合同图片(.{' '}
                    <code>jpg</code> / <code>png</code> / <code>webp</code>) · 最大 5 MB
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    图片会用 GLM-4V 视觉模型 OCR, Word/PDF 直接解析文本
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".docx,.doc,.pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.gif,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                    className="hidden"
                    onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                  />
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
                  <div className="rounded bg-white p-2 border border-slate-200">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-6 w-6 text-slate-500" />
                    ) : (
                      <FileText className="h-6 w-6 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB · {file.type || '未知类型'}
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-200"
                    aria-label="移除"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {error && <div className="text-sm text-risk-high">{error}</div>}

              <div className="flex justify-end gap-2">
                {!file && (
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="btn-secondary"
                  >
                    <Upload className="h-4 w-4" />
                    重新选择
                  </button>
                )}
                {file && (
                  <button onClick={submitFile} className="btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {file.type.startsWith('image/') ? 'OCR + 审阅中...' : '解析 + 审阅中...'} (5-60 秒)
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        开始 AI 审阅
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <ReviewResult
          review={result.review}
          estimatedImpactCents={result.estimatedImpactCents}
          contractName={name}
          fileMeta={result.fileMeta}
          onReset={() => {
            setResult(null);
            setFile(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewResult({
  review,
  estimatedImpactCents,
  contractName,
  fileMeta,
  onReset,
}: {
  review: Review;
  estimatedImpactCents: number;
  contractName: string;
  fileMeta?: FileMeta;
  onReset: () => void;
}) {
  const ratingColor =
    review.summary.overallRating === 'RED'
      ? 'text-risk-high bg-red-50'
      : review.summary.overallRating === 'YELLOW'
        ? 'text-amber-600 bg-amber-50'
        : 'text-emerald-600 bg-emerald-50';
  const ratingText =
    review.summary.overallRating === 'RED'
      ? '🔴 高风险 · 建议拒绝或大改'
      : review.summary.overallRating === 'YELLOW'
        ? '🟡 中风险 · 修改后签署'
        : '🟢 低风险 · 可签署';

  return (
    <div className="space-y-6">
      <div className={`card p-6 ${ratingColor}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm opacity-70">AI 审阅结果</div>
            <div className="text-2xl font-bold mt-1">{ratingText}</div>
            <div className="text-sm mt-2 opacity-80">
              {contractName} · 共识别 {review.risks.length} 条风险
              {fileMeta && (
                <span className="ml-2 text-xs">
                  ({fileMeta.name} · {fileMeta.kind} · {fileMeta.textLength} 字
                  {fileMeta.pages ? ` · ${fileMeta.pages} 页` : ''})
                </span>
              )}
            </div>
          </div>
          <button onClick={onReset} className="btn-secondary">
            <FileText className="h-4 w-4" />
            审阅新合同
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">基本信息</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Row label="对方类型" value={review.summary.counterpartyType} />
          <Row label="合同类型" value={review.summary.contractType} />
          <div className="sm:col-span-2">
            <Row label="关键条款" value={review.summary.keyTerms} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">风险清单 ({review.risks.length})</h2>
        <div className="mt-3 space-y-3">
          {review.risks.length === 0 ? (
            <p className="text-sm text-slate-500">未识别到重大风险</p>
          ) : (
            review.risks.map((r, i) => (
              <div key={i} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      r.severity === 'HIGH'
                        ? 'badge-high'
                        : r.severity === 'MID'
                          ? 'badge-mid'
                          : 'badge-low'
                    }
                  >
                    {r.severity === 'HIGH' ? '高' : r.severity === 'MID' ? '中' : '低'}
                  </span>
                  <span className="text-xs text-slate-500">{r.category}</span>
                  <span className="font-medium text-sm flex-1">{r.title}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                  {r.description}
                </p>
                <div className="mt-2 rounded bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800">
                  💡 {r.suggestion}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {review.missedClauses.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold">缺失条款</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {review.missedClauses.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600">⚠️</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-violet-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold">老板的最终建议</h2>
            <p className="mt-2 text-slate-800">{review.bottomLine}</p>
            <div className="mt-3 text-xs text-slate-500">
              估算年化现金流影响 (粗略):{' '}
              <span className="text-risk-high font-semibold">
                {formatCents(estimatedImpactCents)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-slate-800">{value}</div>
    </div>
  );
}
