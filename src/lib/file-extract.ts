// =====================================================
// 文件解析: 把上传的合同转成纯文本
//
// 支持:
// - .docx  → mammoth
// - .pdf   → pdfjs-dist 3.x (Mozilla 官方, Next.js 兼容)
// - .txt   → 直接读
// - image (jpg/png/webp) → 走 LLM OCR(在调用方处理)
//
// 限制: 5MB
// =====================================================

import mammoth from 'mammoth';
// unpdf: 纯 JS 的 PDF 文本提取, serverless 友好
import { extractText as extractPdfTextFromUnpdf, getDocumentProxy } from 'unpdf';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export class FileExtractError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export type ExtractResult = {
  text: string;
  method: 'docx' | 'pdf' | 'txt';
  pages?: number;
};

export function classifyMime(
  mimeType: string,
  filename: string,
): 'docx' | 'pdf' | 'text' | 'image' | 'unknown' {
  const name = filename.toLowerCase();
  if (mimeType === 'application/pdf' || mimeType === 'application/x-pdf' || name.endsWith('.pdf'))
    return 'pdf';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  )
    return 'docx';
  if (mimeType.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md'))
    return 'text';
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|bmp)$/.test(name))
    return 'image';
  return 'unknown';
}

async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  // unpdf 接受 Uint8Array
  const uint8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);
  // mergePages = true: 拼成一段; 否则是按页的数组
  const result = await extractPdfTextFromUnpdf(pdf, { mergePages: true });
  // 兼容 string | string[]
  const text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text;
  return { text, pages: result.totalPages };
}

export async function extractText(
  buffer: Buffer,
  kind: 'docx' | 'pdf' | 'text',
): Promise<ExtractResult> {
  if (buffer.length > MAX_BYTES) {
    throw new FileExtractError(
      'too_large',
      `文件超过 5MB 上限 (实际 ${(buffer.length / 1024 / 1024).toFixed(1)}MB)`,
    );
  }
  if (kind === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value.trim()) {
      throw new FileExtractError('empty', 'Word 文件未提取到文本,可能为空文档');
    }
    return { text: result.value, method: 'docx' };
  }
  if (kind === 'pdf') {
    const data = await extractPdfText(buffer);
    if (!data.text.trim()) {
      throw new FileExtractError(
        'empty',
        'PDF 未提取到文本,可能是扫描版 PDF(请用 OCR 上传图片)',
      );
    }
    return { text: data.text, method: 'pdf', pages: data.pages };
  }
  if (kind === 'text') {
    const text = buffer.toString('utf8');
    if (!text.trim()) {
      throw new FileExtractError('empty', '文件为空');
    }
    return { text, method: 'txt' };
  }
  throw new FileExtractError('unsupported', '不支持的解析类型');
}
