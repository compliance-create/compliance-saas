import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ShieldCheck } from 'lucide-react';

export default async function AboutPage() {
  const pages = await prisma.cmsPage.findMany({
    where: { published: true },
    orderBy: { slug: 'asc' },
  });
  return (
    <main>
      <header className="border-b border-slate-200 bg-white">
        <div className="container-narrow flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <span className="text-lg font-semibold">合规 SaaS</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-brand-600">
            回到控制台
          </Link>
        </div>
      </header>

      <section className="container-narrow py-12">
        <h1 className="text-3xl font-bold">行业分析方法论</h1>
        <p className="mt-2 text-slate-600">
          完整方法论 + 在合规 SaaS 中的落地方式
        </p>

        <div className="mt-8 space-y-6">
          {pages.map((p) => (
            <article key={p.id} className="card p-6">
              <h2 className="text-xl font-semibold">{p.title}</h2>
              <div className="prose prose-slate mt-3 max-w-none whitespace-pre-wrap text-sm">
                {p.body}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
