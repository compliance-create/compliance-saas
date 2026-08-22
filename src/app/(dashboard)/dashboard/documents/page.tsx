import Link from 'next/link';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export default async function DocumentsPage() {
  const user = await requireUser();
  const docs = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { generatedAt: 'desc' },
    include: { report: { include: { module: true } } },
  });
  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold">我的文档</h1>
      {docs.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          还没有生成的文档。 完成审核后, 在报告页面点击"下载高管摘要"即可生成 docx。
        </div>
      ) : (
        <div className="card p-6">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2">模块</th>
                <th className="py-2">类型</th>
                <th className="py-2">格式</th>
                <th className="py-2">大小</th>
                <th className="py-2">生成时间</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-2">{d.report?.module.name ?? '—'}</td>
                  <td className="py-2">{d.docType}</td>
                  <td className="py-2">{d.format}</td>
                  <td className="py-2 text-xs text-slate-500">
                    {((d.sizeBytes ?? 0) / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-2 text-xs">
                    {d.generatedAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-2">
                    <a
                      href={d.storageKey}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      下载
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
