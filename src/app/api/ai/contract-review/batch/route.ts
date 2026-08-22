// POST /api/ai/contract-review/batch
// 批量审阅: 一次性上传多份合同, 串行调用 LLM, 落库 + 汇总
import { NextResponse } from 'next/server';
import { chat, chatWithImage, LLMUnavailableError } from '@/lib/llm';
import { contractReviewPrompt } from '@/lib/contract-review-prompt';
import { extractText, classifyMime, FileExtractError } from '@/lib/file-extract';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 分钟上限, CloudBase 也认

const MAX_FILES = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const RISK_WEIGHTS = { HIGH: 1, MID: 0.5, LOW: 0.25 };

type ReviewJson = {
  summary: {
    counterpartyType: string;
    contractType: string;
    keyTerms: string;
    overallRating: 'RED' | 'YELLOW' | 'GREEN';
  };
  risks: Array<{
    category: string;
    title: string;
    severity: 'HIGH' | 'MID' | 'LOW';
    description: string;
    suggestion: string;
  }>;
  missedClauses: string[];
  bottomLine: string;
};

function safeParseReviewJson(raw: string): ReviewJson | null {
  try {
    return JSON.parse(raw) as ReviewJson;
  } catch {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) {
      try {
        return JSON.parse(m[1]) as ReviewJson;
      } catch {
        // ignore
      }
    }
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1)) as ReviewJson;
      } catch {
        // ignore
      }
    }
    return null;
  }
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 });
  }
  const form = await req.formData();
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'no_files' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `一次最多 ${MAX_FILES} 份合同, 你上传了 ${files.length} 份` },
      { status: 400 },
    );
  }

  // 共用一个 batchId
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const results: Array<{
    fileName: string;
    success: boolean;
    review?: ReviewJson;
    fileMeta?: { size: number; kind: string; pages?: number; textLength: number };
    impactCents?: number;
    error?: string;
    recordId?: string;
  }> = [];

  let totalImpactCents = 0;
  let redCount = 0;
  let yellowCount = 0;
  let greenCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      if (file.size > MAX_BYTES) {
        results.push({
          fileName: file.name,
          success: false,
          error: `超过 5MB (实际 ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
        });
        errorCount++;
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const kind = classifyMime(file.type, file.name);
      let contractText = '';
      let parsedPages: number | undefined;
      if (kind === 'docx' || kind === 'pdf' || kind === 'text') {
        const r = await extractText(buffer, kind);
        contractText = r.text;
        parsedPages = r.pages;
      } else if (kind === 'image') {
        const base64 = buffer.toString('base64');
        const mime = file.type || 'image/jpeg';
        contractText = await chatWithImage(
          '请 OCR 识别图片中的合同文本, 严格按原文输出, 不要总结。',
          base64,
          mime,
          { temperature: 0.1, maxTokens: 3000 },
        );
      } else {
        results.push({
          fileName: file.name,
          success: false,
          error: `不支持的文件类型: ${file.type || file.name}`,
        });
        errorCount++;
        continue;
      }
      if (contractText.trim().length < 20) {
        results.push({
          fileName: file.name,
          success: false,
          error: '解析出的文本过短',
        });
        errorCount++;
        continue;
      }
      const prompt = contractReviewPrompt({
        contractName: file.name,
        counterparty: '',
        amountCents: 0,
        contractText,
      });
      const raw = await chat(
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        { temperature: 0.4, maxTokens: 2500 },
      );
      const review = safeParseReviewJson(raw);
      if (!review) {
        results.push({
          fileName: file.name,
          success: false,
          error: 'AI 输出无法解析',
        });
        errorCount++;
        continue;
      }
      // 粗估影响: 不依赖 amountCents, 用 HIGH 1万 / MID 3千 / LOW 500
      const baseAmount = 1_000_000; // 1 万
      const impactCents = review.risks.reduce((sum, r) => {
        const w = (RISK_WEIGHTS as Record<string, number>)[r.severity] ?? 0.1;
        return sum + Math.round(baseAmount * 0.5 * w);
      }, 0);
      // 落库
      const rec = await prisma.contractReview.create({
        data: {
          userId: user.id,
          batchId,
          fileName: file.name,
          fileSize: file.size,
          fileKind: kind,
          pages: parsedPages,
          textLength: contractText.length,
          reviewJson: JSON.stringify(review),
          rating: review.summary.overallRating,
          riskCount: review.risks.length,
          impactCents,
        },
      });
      // 汇总
      totalImpactCents += impactCents;
      if (review.summary.overallRating === 'RED') redCount++;
      else if (review.summary.overallRating === 'YELLOW') yellowCount++;
      else greenCount++;

      results.push({
        fileName: file.name,
        success: true,
        review,
        fileMeta: { size: file.size, kind, pages: parsedPages, textLength: contractText.length },
        impactCents,
        recordId: rec.id,
      });
    } catch (e) {
      if (e instanceof FileExtractError) {
        results.push({ fileName: file.name, success: false, error: e.message });
      } else if (e instanceof LLMUnavailableError) {
        results.push({ fileName: file.name, success: false, error: e.message });
      } else {
        results.push({
          fileName: file.name,
          success: false,
          error: e instanceof Error ? e.message : '处理失败',
        });
      }
      errorCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    batchId,
    summary: {
      total: files.length,
      success: files.length - errorCount,
      failed: errorCount,
      red: redCount,
      yellow: yellowCount,
      green: greenCount,
      totalImpactCents,
    },
    results,
  });
}
