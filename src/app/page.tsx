import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ArrowRight, FileSignature, Users, TrendingUp, ShieldCheck } from 'lucide-react';

export default async function HomePage() {
  const moduleCount = await prisma.module.count({ where: { enabled: true } });
  const itemCount = await prisma.checklistItem.count();
  const cmsCount = await prisma.cmsPage.count({ where: { published: true } });

  return (
    <main>
      {/* 顶部导航 */}
      <header className="border-b border-slate-200 bg-white">
        <div className="container-narrow flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <span className="text-lg font-semibold">合规 SaaS</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/pricing" className="text-sm text-slate-700 hover:text-brand-600">
              套餐
            </Link>
            <Link href="/about" className="text-sm text-slate-700 hover:text-brand-600">
              方法论
            </Link>
            <Link href="/login" className="text-sm text-slate-700 hover:text-brand-600">
              登录
            </Link>
            <Link href="/register" className="btn-primary">
              免费试用 7 天
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-narrow py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            把劳动 / 合同风险
            <br />
            <span className="text-brand-600">折算成营收和利润</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            基于「行业分析方法论」, 把你过去只有"违法了会罚多少"的合规视角, 升级为"合规缺失每年让我少赚多少"。
            一次审核, 拿到: 风险清单 + 高管摘要 + 量化现金流影响。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn-primary text-base">
              免费试用 7 天 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="btn-secondary text-base">
              查看套餐
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            目标用户: 小微企业 / 个体工商户
          </p>
        </div>
      </section>

      {/* 数据 + 价值主张 */}
      <section className="container-narrow py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card p-6 text-center">
            <div className="text-4xl font-bold text-brand-600">{moduleCount}</div>
            <div className="mt-1 text-sm text-slate-600">核心模块(持续扩展)</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-4xl font-bold text-brand-600">{itemCount}+</div>
            <div className="mt-1 text-sm text-slate-600">审核点(劳动 79 + 合同 118)</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-4xl font-bold text-brand-600">{cmsCount}</div>
            <div className="mt-1 text-sm text-slate-600">方法论知识库</div>
          </div>
        </div>
      </section>

      {/* 三大功能 */}
      <section className="bg-slate-50 py-16">
        <div className="container-narrow">
          <h2 className="text-center text-3xl font-bold text-slate-900">一套平台, 三件事</h2>
          <p className="mt-3 text-center text-slate-600">为小微企业和个体工商户量身打造</p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <Feature
              icon={<Users className="h-6 w-6" />}
              title="劳动用工合规"
              desc="12 章 79 项审核点, 按用工全生命周期覆盖。自动生成高管摘要, 量化对年化现金流的扣减。"
            />
            <Feature
              icon={<FileSignature className="h-6 w-6" />}
              title="合同合规审核"
              desc="14 大审核维度, 输出 A4 高管版摘要。支持下载 docx, 同步法律依据。"
            />
            <Feature
              icon={<TrendingUp className="h-6 w-6" />}
              title="行业方法论量化"
              desc="把每一项风险折算为「占营收比」「占净利比」, 用老板听得懂的话呈现合规价值。"
            />
          </div>
        </div>
      </section>

      {/* 后期扩展 */}
      <section className="container-narrow py-16">
        <div className="card p-8">
          <h3 className="text-xl font-semibold">未来会加什么</h3>
          <p className="mt-2 text-slate-600">
            平台以「模块」为单位设计, 加一个新模块(如税法、数据合规、知识产权)只需要:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>① 新建 <code className="rounded bg-slate-100 px-1.5 py-0.5">lib/modules/&lt;slug&gt;.ts</code></li>
            <li>② 新建 <code className="rounded bg-slate-100 px-1.5 py-0.5">lib/data/&lt;slug&gt;-items.ts</code> 审核点</li>
            <li>③ 在 impact-engine 注册新的量化规则</li>
            <li>④ 在 modules/registry 启用, 全站自动出现</li>
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            老用户(已订阅)升级新模块免年费; 新用户可以单独加购。
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} 合规 SaaS · 让小微企业用得起、用得懂、用得上的合规工具
      </footer>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}
