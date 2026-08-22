/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 生产构建出独立可执行文件（Docker 自托管用）
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  // 跳过构建期静态生成：SaaS 几乎所有页面都依赖 session/DB, force-dynamic 让 next build 不去预渲染
  // 避免没真实 DB 时构建失败；Vercel 部署时这一行无副作用
  ...(process.env.SKIP_STATIC_GEN ? { experimental: { staticGenerationRetryCount: 0 } } : {}),
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client', 'docx', 'puppeteer-core'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.qcloud.com' },
      { protocol: 'https', hostname: '**.qq.com' },
    ],
  },
};

export default nextConfig;
