import { prisma } from '@/lib/prisma';
import { TrendingUp, MessageSquare, FileText, Users, Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AiStatsPage() {
  const days = 30;
  const since = new Date(Date.now() - days * 86400 * 1000);

  const [chatMessages, contractReviews, reports, users, activeUsers, topQuestions, recentChats, recentReviews] =
    await Promise.all([
      prisma.aiChatMessage.count({ where: { role: 'user', createdAt: { gte: since } } }),
      prisma.contractReview.count({ where: { createdAt: { gte: since } } }),
      prisma.report.count({ where: { generatedAt: { gte: since } } }),
      prisma.user.count(),
      prisma.user.count({
        where: { aiConversations: { some: { updatedAt: { gte: since } } } },
      }),
      prisma.aiChatMessage.groupBy({
        by: ['content'],
        where: { role: 'user', createdAt: { gte: since } },
        _count: { content: true },
        orderBy: { _count: { content: 'desc' } },
        take: 5,
      }),
      prisma.aiChatMessage.findMany({
        where: { role: 'user', createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.contractReview.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

  // 每日统计
  const dailyMap = new Map<string, { chats: number; reviews: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400 * 1000);
    dailyMap.set(d.toISOString().slice(0, 10), { chats: 0, reviews: 0 });
  }
  for (const c of recentChats) {
    const k = c.createdAt.toISOString().slice(0, 10);
    const e = dailyMap.get(k);
    if (e) e.chats++;
  }
  for (const r of recentReviews) {
    const k = r.createdAt.toISOString().slice(0, 10);
    const e = dailyMap.get(k);
    if (e) e.reviews++;
  }
  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));
  const maxDaily = Math.max(1, ...daily.map((d) => d.chats + d.reviews));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI 用量统计</h1>
        <p className="mt-1 text-sm text-slate-500">最近 {days} 天的 AI 能力使用情况</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Stat icon={<MessageSquare className="h-5 w-5 text-violet-500" />} label="AI 问答次数" value={chatMessages} />
        <Stat icon={<FileText className="h-5 w-5 text-emerald-500" />} label="合同审阅次数" value={contractReviews} />
        <Stat icon={<TrendingUp className="h-5 w-5 text-brand-500" />} label="报告生成" value={reports} />
        <Stat icon={<Users className="h-5 w-5 text-amber-500" />} label="活跃用户" value={activeUsers} />
        <Stat icon={<Activity className="h-5 w-5 text-slate-500" />} label="总用户" value={users} />
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">每日用量趋势</h2>
        <div className="mt-4">
          <div className="flex items-end gap-1 h-32">
            {daily.map((d) => {
              const total = d.chats + d.reviews;
              const heightPct = (total / maxDaily) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 group relative"
                  title={`${d.date}: ${d.chats} 问答 / ${d.reviews} 审阅`}
                >
                  <div
                    className="bg-brand-400 rounded-t transition-all hover:bg-brand-500"
                    style={{ height: `${Math.max(2, heightPct)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>{daily[0]?.date}</span>
            <span>{daily[daily.length - 1]?.date}</span>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-brand-400" />
              AI 调用总量(问答 + 审阅)
            </span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">用户问得最多的 5 个问题</h2>
        <div className="mt-3 space-y-2">
          {topQuestions.length === 0 ? (
            <p className="text-sm text-slate-500">暂无数据</p>
          ) : (
            topQuestions.map((q, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-400">#{i + 1}</span>
                  <span className="text-sm truncate">{q.content}</span>
                </div>
                <span className="ml-2 text-xs text-slate-500">{q._count.content} 次</span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        数据每 60 秒刷新 · 基于 PostgreSQL/SQLite 真实数据
      </p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
