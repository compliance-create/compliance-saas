import Link from 'next/link';
import { Check, ShieldCheck } from 'lucide-react';

export default function PricingPage() {
  return (
    <main>
      <header className="border-b border-slate-200 bg-white">
        <div className="container-narrow flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <span className="text-lg font-semibold">合规 SaaS</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-700 hover:text-brand-600">
            登录
          </Link>
        </div>
      </header>

      <section className="container-narrow py-16">
        <h1 className="text-center text-3xl font-bold">简单透明的定价</h1>
        <p className="mt-3 text-center text-slate-600">按年订阅 · 模块打包 · 老用户升级新模块免年费</p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Plan
            name="免费试用"
            price="¥0"
            period="7 天"
            features={['劳动合规 79 项', '合同审核 100+ 项', '高管摘要 docx 下载', '单次审核限制']}
            cta="立即注册"
            href="/register"
            variant="secondary"
          />
          <Plan
            name="小微企业包年"
            price="¥998"
            period="/ 年"
            features={[
              '所有模块无限次审核',
              '行业方法论量化报告',
              '自动生成 docx 底稿/摘要',
              '微信小程序入口',
              '持续更新的审核清单',
              '7×12 客服支持',
            ]}
            cta="开始订阅"
            href="/register"
            variant="primary"
            highlight
          />
          <Plan
            name="个体工商户轻量版"
            price="¥498"
            period="/ 年"
            features={['单模块二选一(劳动或合同)', '高管摘要', '微信小程序入口', '不支持自定义公式']}
            cta="即将上线"
            href="/register"
            variant="secondary"
          />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          所有套餐均含: 基于《行业分析方法论》的量化引擎 + 完整法律依据库 + 微信支付
        </p>
      </section>
    </main>
  );
}

function Plan({
  name,
  price,
  period,
  features,
  cta,
  href,
  variant,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  variant: 'primary' | 'secondary';
  highlight?: boolean;
}) {
  return (
    <div
      className={`card p-6 ${highlight ? 'border-2 border-brand-500 ring-2 ring-brand-100' : ''}`}
    >
      <div className="text-sm font-medium text-slate-500">{name}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-slate-500">{period}</span>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 flex-shrink-0 text-brand-600 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-6 block text-center ${
          variant === 'primary' ? 'btn-primary' : 'btn-secondary'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
