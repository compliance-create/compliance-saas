'use client';
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatCents as fmt } from '@/lib/utils';

// 1802-2006 美国长期资本回报率(来自方法论第二部分)
const discountData = [
  { period: '1802~2006', nominal: 8.3, real: 6.8, label: '204 年' },
  { period: '1871~2006', nominal: 8.9, real: 6.7, label: '135 年' },
  { period: '1926~2006', nominal: 10.1, real: 6.8, label: '80 年' },
  { period: '1946~2006', nominal: 11.2, real: 6.9, label: '60 年' },
];

// 客户侧自由现金流演示数据
const cashflowSteps = [
  { name: '主营业务收入', value: 100, fill: '#2f7eff' },
  { name: '- 应收变化', value: -8, fill: '#dc2626' },
  { name: '+ 预收变化', value: 5, fill: '#16a34a' },
  { name: '客户侧流入', value: 0, isTotal: true, fill: '#0f172a' },
  { name: '- 主营业务成本', value: -52, fill: '#dc2626' },
  { name: '- 存货增加', value: -7, fill: '#dc2626' },
  { name: '+ 应付变化', value: 3, fill: '#16a34a' },
  { name: '净产出', value: 0, isTotal: true, fill: '#0f172a' },
];

// 案例对比(方法论第 8.3 节)
const caseStudies = [
  {
    name: '东鹏饮料',
    coreLinks: '生产 + 销售',
    opexRatio: 57.67,
    coreAssets: '生产 45.6% (原材料) + 销售 18.4% (人工 + 品牌)',
  },
  {
    name: '华测检测',
    coreLinks: '管理 + 销售',
    opexRatio: 50.61,
    coreAssets: '管理 20% (长期-人工) + 销售 10.7% (长期-人工)',
  },
];

export function MethodViz({
  demoReport,
}: {
  demoReport: {
    moduleName: string;
    totalImpactCents: number;
    revenueImpactPct: number;
    profitImpactPct: number;
    rating: string;
    highRiskCount: number;
    midRiskCount: number;
  } | null;
}) {
  return (
    <div className="container-narrow space-y-8 pb-16">
      {/* 1. 折现率历史 */}
      <Section
        idx={1}
        title="折现率: 来自 200 年资本市场的真相"
        subtitle="第二部分 · 折现率的确定"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={discountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[4, 12]}
                />
                <Tooltip
                  formatter={(v: number) => `${v}%`}
                  labelStyle={{ color: '#0f172a' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="nominal"
                  stroke="#2f7eff"
                  strokeWidth={2}
                  name="名义总体回报率"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="real"
                  stroke="#16a34a"
                  strokeWidth={2}
                  name="实际回报率(扣通胀)"
                  dot={{ r: 4 }}
                />
                <ReferenceLine
                  y={9}
                  stroke="#dc2626"
                  strokeDasharray="5 5"
                  label={{ value: '本平台推荐 9%', position: 'right', fontSize: 11, fill: '#dc2626' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-slate-700">
              杰里米 · 西格尔《股市长线法宝》整理的 200 年美国资本市场数据, 给出了一个稳健结论:
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-brand-600">●</span>
                <span>股票资本长期回报率 ≈ <b>6%</b></span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-600">●</span>
                <span>含通胀的全部长期资本回报率 ≈ <b>8%</b></span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-600">●</span>
                <span>含通胀的长期股票资本回报率 ≈ <b>9%</b></span>
              </li>
            </ul>
            <p className="text-xs text-slate-500 pt-2">
              本平台对所有小微企业统一采用 9% 折现率, 折现区间 6%-9% 视企业相对优势调整。
            </p>
          </div>
        </div>
      </Section>

      {/* 2. 自由现金流瀑布图 */}
      <Section
        idx={2}
        title="自由现金流: 把每一笔收入折成净产出"
        subtitle="第十一部分 · DCF 框架"
      >
        <p className="text-sm text-slate-600 mb-4">
          短期分配来源 = 资金产出 - 资金占用。 下图演示一家年营收 100 万的典型小微企业:
        </p>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={cashflowSteps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v: number) => `${v} 万`} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {cashflowSteps.map((entry, i) => (
                  <Bar key={i} fill={entry.fill} dataKey="value" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          单位: 万元 · 净产出 = 客户侧流入 + 供应商侧流出 (负向为支出)
        </p>
      </Section>

      {/* 3. 互动计算器 ⭐ */}
      <Section
        idx={3}
        title="试试看: 你的合规缺失值多少钱?"
        subtitle="互动计算器 · 基于上述方法论"
        highlight
      >
        <Calculator />
      </Section>

      {/* 4. 真实案例 */}
      <Section
        idx={4}
        title="真实案例: 核心资产视角下的合规风险"
        subtitle="第八部分 · 核心资产分析"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {caseStudies.map((c) => (
            <div key={c.name} className="card p-5">
              <div className="text-lg font-semibold">{c.name}</div>
              <div className="text-sm text-slate-500 mt-1">核心环节: {c.coreLinks}</div>
              <div className="mt-3 text-sm">
                <span className="text-slate-500">营业成本占比: </span>
                <span className="font-mono font-semibold text-brand-600">{c.opexRatio}%</span>
              </div>
              <div className="mt-2 text-sm text-slate-700">{c.coreAssets}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          启示: 劳动占成本 9-20% 时, 任何劳动合规问题都会直接侵蚀净产出。
          这正是为什么本平台把劳动 / 合同风险优先量化到净利视角。
        </p>
      </Section>

      {/* 5. 演示用户的真实数据(如有) */}
      {demoReport && (
        <Section
          idx={5}
          title="实战数据: 演示用户最近一次审核"
          subtitle="真实运行结果"
          highlight
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="模块" value={demoReport.moduleName} />
            <Card
              label="评级"
              value={demoReport.rating}
              tone={
                demoReport.rating === 'RED'
                  ? 'high'
                  : demoReport.rating === 'YELLOW'
                    ? 'mid'
                    : 'low'
              }
            />
            <Card
              label="年化现金流损失"
              value={fmt(demoReport.totalImpactCents)}
              tone="high"
            />
            <Card
              label="占净利比"
              value={`${(demoReport.profitImpactPct * 100).toFixed(2)}%`}
              tone="high"
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            这是 demo 账号最近一次审核的真实结果, 高风险 {demoReport.highRiskCount} 项 / 中风险{' '}
            {demoReport.midRiskCount} 项, 按折现率 9% 折现到当期净产出。
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({
  idx,
  title,
  subtitle,
  children,
  highlight,
}: {
  idx: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={`card p-6 ${highlight ? 'ring-2 ring-brand-200 bg-gradient-to-br from-white to-brand-50/50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-bold">
          {idx}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'high' | 'mid' | 'low';
}) {
  const toneClass =
    tone === 'high' ? 'text-risk-high' : tone === 'mid' ? 'text-amber-600' : tone === 'low' ? 'text-emerald-600' : '';
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

// ============ 互动计算器 ============
function Calculator() {
  const [revenue, setRevenue] = useState(500); // 万元
  const [grossMargin, setGrossMargin] = useState(0.4);
  const [headcount, setHeadcount] = useState(10);
  const [avgSalary, setAvgSalary] = useState(8000);
  const [uncompliantCount, setUncompliantCount] = useState(3);

  const result = useMemo(() => {
    const revenueCents = revenue * 10000 * 100; // 元 → 分
    const grossProfitCents = revenueCents * grossMargin;
    const netProfitCents = grossProfitCents * 0.4; // 估算系数
    const avgSalaryCents = avgSalary * 100; // 元 → 分

    // 简化: 每项不合规平均造成 X 万元损失(按本平台已校准的引擎)
    // HIGH: 4-15 万, MID: 0.5-2 万, LOW: <0.1 万
    const avgImpactPerItem = 6; // 万元
    const totalImpactWan = uncompliantCount * avgImpactPerItem;
    const totalImpactCents = totalImpactWan * 10000 * 100;

    // 折现 5 年
    const r = 0.09;
    const discounted =
      totalImpactCents * ((1 - Math.pow(1 + r, -5)) / r);
    return {
      revenueCents,
      grossProfitCents,
      netProfitCents,
      avgSalaryCents,
      totalImpactCents,
      discountedCents: Math.round(discounted),
      revenueImpactPct: totalImpactCents / revenueCents,
      profitImpactPct: totalImpactCents / netProfitCents,
    };
  }, [revenue, grossMargin, headcount, avgSalary, uncompliantCount]);

  const chartData = useMemo(
    () => [
      { name: '当前年营收', value: revenue, fill: '#2f7eff' },
      { name: '毛利', value: +(revenue * grossMargin).toFixed(1), fill: '#599fff' },
      { name: '估算净利', value: +(revenue * grossMargin * 0.4).toFixed(1), fill: '#16a34a' },
      { name: '合规风险损失', value: +(uncompliantCount * 6).toFixed(1), fill: '#dc2626' },
      { name: '折现 5 年值', value: +((uncompliantCount * 6) * 3.8897).toFixed(1), fill: '#7c2d12' },
    ],
    [revenue, grossMargin, uncompliantCount],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.4fr] gap-6">
      {/* 左侧: 输入 */}
      <div className="space-y-4">
        <NumField
          label="年营收"
          value={revenue}
          onChange={setRevenue}
          suffix="万元"
          min={10}
          max={100000}
          step={10}
        />
        <NumField
          label="毛利率"
          value={grossMargin}
          onChange={setGrossMargin}
          suffix=""
          min={0.05}
          max={0.95}
          step={0.05}
          isDecimal
        />
        <NumField
          label="员工数"
          value={headcount}
          onChange={setHeadcount}
          suffix="人"
          min={1}
          max={1000}
        />
        <NumField
          label="平均月薪"
          value={avgSalary}
          onChange={setAvgSalary}
          suffix="元"
          min={3000}
          max={50000}
          step={500}
        />
        <NumField
          label="预期不合规项数"
          value={uncompliantCount}
          onChange={setUncompliantCount}
          suffix="项"
          min={0}
          max={50}
        />

        <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
          💡 计算假设: 折现率 9%, 每项不合规平均造成约 6 万元年化现金流损失(基于本平台校准的引擎数据)。
          实际审核中, 不同模块/风险等级会有更细的折算。
        </div>
      </div>

      {/* 右侧: 输出 */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card label="年化现金流损失" value={fmt(result.totalImpactCents)} tone="high" />
          <Card
            label="5 年折现值"
            value={fmt(result.discountedCents)}
            tone="high"
          />
          <Card
            label="占营收比"
            value={`${(result.revenueImpactPct * 100).toFixed(2)}%`}
          />
          <Card
            label="占净利比"
            value={`${(result.profitImpactPct * 100).toFixed(2)}%`}
            tone="high"
          />
        </div>
        <div className="h-56 rounded-md border border-slate-200 bg-white p-2">
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => `${v} 万`} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((d, i) => (
                  <Bar key={i} fill={d.fill} dataKey="value" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 text-center">单位: 万元</p>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step,
  isDecimal,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
  isDecimal?: boolean;
}) {
  return (
    <div>
      <label className="label flex items-center justify-between">
        <span>{label}</span>
        <span className="text-xs text-slate-400">
          {min} ~ {max}
          {suffix ?? ''}
        </span>
      </label>
      <div className="flex items-center gap-2">
        <input
          className="input"
          type="number"
          value={value}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="text-sm text-slate-500 w-8">{suffix}</span>}
      </div>
    </div>
  );
}
