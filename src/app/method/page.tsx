import Link from 'next/link';
import { ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { MethodViz } from '@/components/method/MethodViz';

export const metadata = {
  title: '行业分析方法论可视化 · 合规 SaaS',
  description: '基于 DCF + 自由现金流 + 折现率,把合规风险折算到营收和利润视角。',
};

export default async function MethodPage() {
  // 拉真实 demo 报告数据(若有)
  const demoReport = await prisma.report.findFirst({
    where: { user: { email: 'demo@example.com' } },
    orderBy: { generatedAt: 'desc' },
    include: { module: true },
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container-narrow flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <span className="font-semibold">合规 SaaS</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/about" className="text-slate-700 hover:text-brand-600">
              <BookOpen className="inline h-4 w-4 mr-1" />
              文字版
            </Link>
            <Link href="/dashboard" className="btn-primary">
              进入控制台 <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container-narrow pt-16 pb-10 text-center">
        <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          行业分析方法论 · 可视化
        </div>
        <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
          把合规风险
          <br />
          <span className="text-brand-600">翻译成营收和利润</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          基于 DCF 折现 + 自由现金流框架, 每一项劳动 / 合同风险都被折算为「年化现金流损失」和「占净利比」——
          老板听得懂的语言。
        </p>
      </section>

      {/* 核心公式区 */}
      <section className="container-narrow pb-12">
        <div className="card p-8 text-center bg-slate-900 text-white">
          <div className="text-xs uppercase tracking-widest text-slate-400">企业价值评估核心</div>
          <div className="mt-3 text-3xl sm:text-4xl font-mono font-bold">
            V = Σ ( D<sub>t</sub> / (1 + r)<sup>t</sup> )
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded bg-slate-800 px-3 py-2">
              <span className="text-slate-400">V</span> = 企业价值
            </div>
            <div className="rounded bg-slate-800 px-3 py-2">
              <span className="text-slate-400">D<sub>t</sub></span> = 第 t 年净产出
            </div>
            <div className="rounded bg-slate-800 px-3 py-2">
              <span className="text-slate-400">r</span> = 折现率 (9%)
            </div>
          </div>
        </div>
      </section>

      {/* 主可视化区 */}
      <MethodViz demoReport={demoReport ? {
        moduleName: demoReport.module.name,
        totalImpactCents: demoReport.totalImpactCents,
        revenueImpactPct: demoReport.revenueImpactPct ?? 0,
        profitImpactPct: demoReport.profitImpactPct ?? 0,
        rating: demoReport.rating,
        highRiskCount: demoReport.highRiskCount,
        midRiskCount: demoReport.midRiskCount,
      } : null} />

      <section className="container-narrow py-12">
        <div className="card p-6 text-center">
          <h3 className="text-xl font-semibold">看到自己的数字会怎样?</h3>
          <p className="mt-2 text-sm text-slate-600">
            注册后, 填入你公司的营收 / 员工数, 引擎会基于上面的方法论, 跑一份专属于你的合规报告。
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/register" className="btn-primary">
              免费试用 7 天
            </Link>
            <Link href="/pricing" className="btn-secondary">
              查看套餐
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        方法论基于《高阶商业策略》课程体系 · 完整 14 部分详见
        <Link href="/about" className="ml-1 text-brand-600 hover:underline">
          文字版
        </Link>
      </footer>
    </main>
  );
}
