// POST /api/ai/contract-review/file
// multipart/form-data: { file, contractName?, counterparty?, amountCents? }
// 解析上传的合同(图片/Word/PDF/TXT) → 文本 → AI 审阅
import { NextResponse } from 'next/server';
import { chat, chatWithImage, LLMUnavailableError } from '@/lib/llm';
import { contractReviewPrompt } from '@/lib/contract-review-prompt';
import { extractText, classifyMime, FileExtractError } from '@/lib/file-extract';
import { requireUser } from '@/lib/auth-helpers';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

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
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `文件超过 5MB 上限 (实际 ${(file.size / 1024 / 1024).toFixed(1)}MB)` },
      { status: 413 },
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = classifyMime(file.type, file.name);
  const contractName = String(form.get('contractName') ?? file.name ?? '');
  const counterparty = String(form.get('counterparty') ?? '');
  const amountCents = Number(form.get('amountCents') ?? 0) || 0;

  // 1) 解析文件 → 文本
  let contractText = '';
  let parsedPages: number | undefined;
  try {
    if (kind === 'docx' || kind === 'pdf' || kind === 'text') {
      const result = await extractText(buffer, kind);
      contractText = result.text;
      parsedPages = result.pages;
    } else if (kind === 'image') {
      // 走视觉模型 OCR
      const base64 = buffer.toString('base64');
      const mime = file.type || 'image/jpeg';
      const ocrPrompt =
        '请 OCR 识别图片中的合同文本,严格按原文输出,不要添加任何总结或评论。如果是扫描件,请逐字识别。如果是手写体,尽量识别并标注[手写]。';
      contractText = await chatWithImage(ocrPrompt, base64, mime, {
        temperature: 0.1,
        maxTokens: 3000,
      });
    } else {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type || file.name}` },
        { status: 415 },
      );
    }
  } catch (e) {
    if (e instanceof FileExtractError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error('file extract error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '文件解析失败' },
      { status: 500 },
    );
  }

  if (!contractText.trim() || contractText.trim().length < 20) {
    return NextResponse.json(
      { error: '解析出的文本过短,可能不是有效合同。请改用文本输入或人工确认文件。' },
      { status: 400 },
    );
  }

  // 2) AI 审阅
  const prompt = contractReviewPrompt({
    contractName,
    counterparty,
    amountCents,
    contractText,
  });
  try {
    const raw = await chat(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      { temperature: 0.4, maxTokens: 2500 },
    );
    const review = safeParseReviewJson(raw);
    if (!review) {
      return NextResponse.json({ error: 'AI 输出无法解析为 JSON', raw }, { status: 502 });
    }
    // 量化
    const riskWeights = { HIGH: 1, MID: 0.5, LOW: 0.25 };
    const baseAmount = amountCents || 1000000;
    const estimatedImpactCents = review.risks.reduce((sum, r) => {
      const w = riskWeights[r.severity] ?? 0.1;
      return sum + Math.round(baseAmount * 0.05 * w);
    }, 0);
    return NextResponse.json({
      ok: true,
      fileMeta: {
        name: file.name,
        size: file.size,
        type: file.type,
        kind,
        pages: parsedPages,
        textLength: contractText.length,
      },
      review,
      estimatedImpactCents,
    });
  } catch (e) {
    if (e instanceof LLMUnavailableError) {
      return NextResponse.json({ error: e.message, code: 'llm_unavailable' }, { status: 503 });
    }
    console.error('ai contract-review file error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI 调用失败' },
      { status: 500 },
    );
  }
}
