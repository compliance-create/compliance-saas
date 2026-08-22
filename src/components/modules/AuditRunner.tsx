'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Save, FileText } from 'lucide-react';
import { formatCents, pct } from '@/lib/utils';
import { AiExplainButton } from '@/components/modules/AiExplainButton';

type Item = {
  id: string;
  chapter: string;
  chapterTitle: string;
  orderIndex: number;
  title: string;
  keyPoints: string;
  legalBasis: string[];
  riskLevel: 'HIGH' | 'MID' | 'LOW';
  answerSchema: Record<string, unknown>;
};

type Assumption = {
  revenueCents: number;
  grossMargin: number;
  headcount: number;
  avgSalaryCents: number;
  estimatedGrossProfitCents: number;
  estimatedNetProfitCents: number;
};

export function AuditRunner({
  runId,
  items,
  initialAnswers,
  assumption,
}: {
  runId: string;
  items: Item[];
  initialAnswers: Record<string, Record<string, unknown>>;
  assumption: Assumption;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>(initialAnswers);
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) {
      if (!m.has(it.chapter)) m.set(it.chapter, []);
      m.get(it.chapter)!.push(it);
    }
    return Array.from(m.entries()).sort(([a], [b]) => Number(a) - Number(b));
  }, [items]);

  const active = items[activeIdx];
  const answered = Object.keys(answers).length;
  const pctAnswered = Math.round((answered / items.length) * 100);

  async function savePartial() {
    setSaving(true);
    const payload = Object.entries(answers).map(([itemId, answer]) => ({ itemId, answer }));
    await fetch(`/api/audit/${runId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: payload, complete: false }),
    });
    setSaving(false);
  }

  async function complete() {
    if (answered < items.length) {
      if (!confirm(`还有 ${items.length - answered} 项未答, 仍要生成报告吗?`)) return;
    }
    setCompleting(true);
    const payload = Object.entries(answers).map(([itemId, answer]) => ({ itemId, answer }));
    // 补全未答的项(默认合规)
    for (const it of items) {
      if (!answers[it.id]) {
        payload.push({ itemId: it.id, answer: { compliant: true, note: '未填写' } });
      }
    }
    const res = await fetch(`/api/audit/${runId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: payload, complete: true }),
    });
    const j = await res.json();
    setCompleting(false);
    if (j.reportId) {
      router.push(`/dashboard/report/${j.reportId}`);
    } else {
      alert('生成报告失败');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
      {/* 左侧导航 */}
      <aside className="space-y-4">
        <div className="card p-4">
          <div className="text-sm font-medium">进度</div>
          <div className="mt-2 h-2 w-full rounded bg-slate-200">
            <div
              className="h-2 rounded bg-brand-500 transition-all"
              style={{ width: `${pctAnswered}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {answered} / {items.length} ({pctAnswered}%)
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={savePartial}
              disabled={saving}
              className="btn-secondary text-xs"
            >
              <Save className="h-3 w-3" />
              {saving ? '保存中' : '保存'}
            </button>
            <button
              onClick={complete}
              disabled={completing}
              className="btn-primary text-xs"
            >
              <FileText className="h-3 w-3" />
              {completing ? '生成中' : '生成报告'}
            </button>
          </div>
        </div>

        <div className="card p-2 max-h-[60vh] overflow-y-auto">
          {grouped.map(([chapter, list]) => (
            <div key={chapter} className="mb-2">
              <div className="px-2 py-1 text-xs font-medium text-slate-500">
                第 {chapter} 章
              </div>
              {list.map((it, i) => {
                const idx = items.findIndex((x) => x.id === it.id);
                const isAnswered = !!answers[it.id];
                return (
                  <button
                    key={it.id}
                    onClick={() => setActiveIdx(idx)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                      idx === activeIdx
                        ? 'bg-brand-50 text-brand-700'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {isAnswered ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-slate-300" />
                      )}
                      <span className="truncate">{it.title}</span>
                    </div>
                    <span
                      className={
                        it.riskLevel === 'HIGH'
                          ? 'badge-high ml-4'
                          : it.riskLevel === 'MID'
                            ? 'badge-mid ml-4'
                            : 'badge-low ml-4'
                      }
                    >
                      {it.riskLevel === 'HIGH' ? '高' : it.riskLevel === 'MID' ? '中' : '低'}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* 主区: 当前题 */}
      <div>
        {active && (
          <ItemEditor
            key={active.id}
            item={active}
            value={answers[active.id]}
            onChange={(v) => setAnswers({ ...answers, [active.id]: v })}
            assumption={assumption}
          />
        )}
        <div className="mt-4 flex justify-between">
          <button
            onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
            className="btn-secondary"
            disabled={activeIdx === 0}
          >
            上一项
          </button>
          <button
            onClick={() => setActiveIdx(Math.min(items.length - 1, activeIdx + 1))}
            className="btn-primary"
            disabled={activeIdx === items.length - 1}
          >
            下一项
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  value,
  onChange,
  assumption,
}: {
  item: Item;
  value: Record<string, unknown> | undefined;
  onChange: (v: Record<string, unknown>) => void;
  assumption: Assumption;
}) {
  const v = value ?? { compliant: undefined };
  const set = (k: string, val: unknown) => onChange({ ...v, [k]: val });
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 text-xs">
        <span
          className={
            item.riskLevel === 'HIGH'
              ? 'badge-high'
              : item.riskLevel === 'MID'
                ? 'badge-mid'
                : 'badge-low'
          }
        >
          {item.riskLevel === 'HIGH' ? '高风险' : item.riskLevel === 'MID' ? '中风险' : '低风险'}
        </span>
        <span className="text-slate-500">{item.chapterTitle}</span>
      </div>
      <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{item.keyPoints}</p>

      <AiExplainButton
        title={item.title}
        keyPoints={item.keyPoints}
        legalBasis={item.legalBasis}
        riskLevel={item.riskLevel}
        answer={v}
      />

      <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs">
        <div className="font-medium text-slate-700">法律依据</div>
        <ul className="mt-1 space-y-0.5 text-slate-600">
          {item.legalBasis.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="label">是否合规?</label>
          <div className="flex gap-2">
            <button
              onClick={() => set('compliant', true)}
              className={`btn ${v.compliant === true ? 'bg-emerald-600 text-white' : 'btn-secondary'}`}
            >
              ✅ 合规
            </button>
            <button
              onClick={() => set('compliant', false)}
              className={`btn ${v.compliant === false ? 'bg-red-600 text-white' : 'btn-secondary'}`}
            >
              ❌ 不合规
            </button>
          </div>
        </div>

        {/* 动态字段 */}
        {Object.entries(item.answerSchema).map(([k, def]) => {
          if (k === 'compliant' || k === 'note') return null;
          const d = def as { label?: string; type?: string; min?: number; max?: number; step?: number };
          return (
            <div key={k}>
              <label className="label">
                {d.label ?? k}
                {d.type === 'number' && (
                  <span className="ml-2 text-xs text-slate-400">
                    (范围 {d.min ?? 0} ~ {d.max ?? '∞'})
                  </span>
                )}
              </label>
              <input
                className="input"
                type={d.type === 'number' ? 'number' : 'text'}
                value={(v[k] as string | number) ?? ''}
                step={d.step}
                min={d.min}
                max={d.max}
                onChange={(e) =>
                  set(
                    k,
                    d.type === 'number' ? Number(e.target.value) : e.target.value,
                  )
                }
              />
            </div>
          );
        })}

        <div>
          <label className="label">备注 / 现场情况</label>
          <textarea
            className="input"
            rows={3}
            value={(v.note as string) ?? ''}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 rounded-md bg-brand-50 p-3 text-xs text-brand-900">
        💡 量化引擎将基于以上输入, 按《行业分析方法论》折算到年营收 ¥
        {(assumption.revenueCents / 100).toLocaleString()} / 净利 ¥
        {(assumption.estimatedNetProfitCents / 100).toLocaleString()} 的视角。
      </div>
    </div>
  );
}
