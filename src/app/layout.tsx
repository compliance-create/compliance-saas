import type { Metadata } from 'next';
import './globals.css';

// SaaS 几乎所有页面都依赖 session/DB, 默认全部按需渲染
// 这样 next build 不会去预渲染拉 DB, 部署到 Vercel 时也省 SSR cookie 处理
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: '合规 SaaS - 小微企业劳动合规与合同审核',
  description:
    '基于行业分析方法论的合规风险量化平台: 劳动合规 79 项 + 合同审核 100+ 项,折算到营收与利润视角。',
  keywords: ['劳动合规', '合同审核', '小微企业', 'SaaS', '合规量化'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
