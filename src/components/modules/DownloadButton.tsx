'use client';
import { useState } from 'react';
import { Download, FileText, FileType2 } from 'lucide-react';

export function DownloadButton({ reportId }: { reportId: string }) {
  const [loadingFmt, setLoadingFmt] = useState<'docx' | 'pdf' | null>(null);
  const [urls, setUrls] = useState<{ docx?: string; pdf?: string }>({});
  const [error, setError] = useState<string | null>(null);

  async function gen(fmt: 'docx' | 'pdf') {
    setLoadingFmt(fmt);
    setError(null);
    const path = fmt === 'pdf' ? `/api/reports/${reportId}/pdf` : `/api/reports/${reportId}`;
    const res = await fetch(path, { method: 'POST' });
    const j = await res.json();
    setLoadingFmt(null);
    if (j.url) setUrls({ ...urls, [fmt]: j.url });
    else setError(j.error ?? '生成失败');
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => gen('docx')}
          className="btn-secondary"
          disabled={!!loadingFmt}
        >
          <FileText className="h-4 w-4" />
          {loadingFmt === 'docx' ? '生成中...' : 'Word 摘要'}
        </button>
        <button
          onClick={() => gen('pdf')}
          className="btn-primary"
          disabled={!!loadingFmt}
        >
          <FileType2 className="h-4 w-4" />
          {loadingFmt === 'pdf' ? '生成中...' : 'PDF 摘要'}
        </button>
      </div>
      {urls.docx && (
        <a
          href={urls.docx}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-brand-600 underline flex items-center gap-1"
        >
          <Download className="h-3 w-3" />
          docx 已生成
        </a>
      )}
      {urls.pdf && (
        <a
          href={urls.pdf}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-brand-600 underline flex items-center gap-1"
        >
          <Download className="h-3 w-3" />
          PDF 已生成
        </a>
      )}
      {error && <div className="text-xs text-risk-high">{error}</div>}
    </div>
  );
}
