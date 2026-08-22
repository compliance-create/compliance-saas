// =====================================================
// 文档生成器: 把审核结果 / 摘要 / 底稿 渲染成 PDF / DOCX
//
// 策略:
// 1. 渲染 HTML(React 服务端组件产出 string)
// 2. docx: 用 docx 库构造(纯 node, 不依赖浏览器)
// 3. pdf:  生产用 puppeteer-core + 部署环境 chrome; 本地开发/CloudBase
//          静态层不依赖 chrome, 优先走 docx + 浏览器"另存为 PDF"的方案
//
// 为避免外部依赖, 这里优先输出 docx; PDF 通过 docx 转换或后续接入 headless chrome
// =====================================================

import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  BorderStyle,
} from 'docx';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const RISK_COLORS: Record<string, string> = {
  HIGH: 'C00000',
  MID: 'BF8F00',
  LOW: '548235',
};

const RATING_COLORS: Record<string, string> = {
  RED: 'C00000',
  YELLOW: 'BF8F00',
  GREEN: '548235',
};

export type DocxGenerateInput = {
  title: string;
  subtitle?: string;
  companyName: string;
  moduleName: string;
  rating: 'RED' | 'YELLOW' | 'GREEN';
  generatedAt: Date;
  totals: {
    totalImpactCents: number;
    revenueImpactPct: number;
    profitImpactPct: number;
    high: number;
    mid: number;
    low: number;
  };
  sections: Array<{
    chapterTitle: string;
    items: Array<{
      title: string;
      riskLevel: string;
      keyPoints: string;
      legalBasis: string;
      answer: string;
      impactCents?: number;
      impactNarrative?: string;
    }>;
  }>;
  summaryBullets: string[];
  aiAdvice?: string;
};

function riskBadge(level: string): TextRun {
  const color = RISK_COLORS[level] ?? '000000';
  const label = level === 'HIGH' ? '高' : level === 'MID' ? '中' : '低';
  return new TextRun({ text: `[${label}]`, bold: true, color });
}

function yuan(cents: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(cents / 100);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export async function generateSummaryDocx(input: DocxGenerateInput): Promise<Buffer> {
  const doc = new DocxDocument({
    creator: 'Compliance SaaS',
    title: input.title,
    description: input.subtitle ?? '',
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: input.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          ...(input.subtitle
            ? [
                new Paragraph({
                  text: input.subtitle,
                  alignment: AlignmentType.CENTER,
                }),
              ]
            : []),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: '委托方: ', bold: true }),
              new TextRun({ text: input.companyName }),
              new TextRun({ text: '    模块: ', bold: true }),
              new TextRun({ text: input.moduleName }),
              new TextRun({ text: '    报告日期: ', bold: true }),
              new TextRun({ text: input.generatedAt.toISOString().slice(0, 10) }),
            ],
          }),
          new Paragraph({ text: '' }),
          // ===== 总体评级 =====
          new Paragraph({
            text: '一、总体评级',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  input.rating === 'RED'
                    ? '🔴 高风险  ·  建议立即整改'
                    : input.rating === 'YELLOW'
                      ? '🟡 中风险  ·  修改后签署/通过'
                      : '🟢 低风险  ·  可签署/通过',
                bold: true,
                color: RATING_COLORS[input.rating],
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          // ===== 量化结论 =====
          new Paragraph({
            text: '二、量化结论(基于《行业分析方法论》折算)',
            heading: HeadingLevel.HEADING_1,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('高风险项')] }),
                  new TableCell({ children: [new Paragraph(String(input.totals.high))] }),
                  new TableCell({ children: [new Paragraph('中风险项')] }),
                  new TableCell({ children: [new Paragraph(String(input.totals.mid))] }),
                  new TableCell({ children: [new Paragraph('低风险项')] }),
                  new TableCell({ children: [new Paragraph(String(input.totals.low))] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('年化现金流损失')] }),
                  new TableCell({
                    children: [new Paragraph(yuan(input.totals.totalImpactCents))],
                  }),
                  new TableCell({ children: [new Paragraph('占营收比')] }),
                  new TableCell({
                    children: [new Paragraph(pct(input.totals.revenueImpactPct))],
                  }),
                  new TableCell({ children: [new Paragraph('占净利比')] }),
                  new TableCell({
                    children: [new Paragraph(pct(input.totals.profitImpactPct))],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          // ===== 关键提示 =====
          new Paragraph({
            text: '三、关键风险提示',
            heading: HeadingLevel.HEADING_1,
          }),
          ...input.summaryBullets.map(
            (b) =>
              new Paragraph({
                text: `■ ${b}`,
                spacing: { after: 100 },
              }),
          ),
          new Paragraph({ text: '' }),
          // ===== 详细审核 =====
          new Paragraph({
            text: '四、审核明细',
            heading: HeadingLevel.HEADING_1,
          }),
          ...input.sections.flatMap((sec) => [
            new Paragraph({
              text: sec.chapterTitle,
              heading: HeadingLevel.HEADING_2,
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: ['序号', '审核事项', '风险', '审核要点', '法律依据', '现场情况', '量化影响']
                    .map(
                      (h) =>
                        new TableCell({
                          shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
                          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                        }),
                    ),
                }),
                ...sec.items.map(
                  (it, i) =>
                    new TableRow({
                      children: [
                        new TableCell({ children: [new Paragraph(String(i + 1))] }),
                        new TableCell({ children: [new Paragraph(it.title)] }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [riskBadge(it.riskLevel)],
                            }),
                          ],
                        }),
                        new TableCell({ children: [new Paragraph(it.keyPoints)] }),
                        new TableCell({ children: [new Paragraph(it.legalBasis)] }),
                        new TableCell({ children: [new Paragraph(it.answer || '—')] }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: it.impactCents ? yuan(it.impactCents) : '—',
                                  bold: true,
                                  color: it.impactCents ? 'C00000' : '000000',
                                }),
                                ...(it.impactNarrative
                                  ? [new TextRun({ text: `\n${it.impactNarrative}`, break: 1 })]
                                  : []),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                ),
              ],
            }),
            new Paragraph({ text: '' }),
          ]),
          // ===== AI 战略建议(可选) =====
          ...(input.aiAdvice
            ? [
                new Paragraph({
                  text: '五、AI 战略建议',
                  heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '由 AI 基于量化数据自动生成, 仅供参考, 不构成个案法律意见。',
                      italics: true,
                      size: 18,
                      color: '808080',
                    }),
                  ],
                }),
                new Paragraph({ text: '' }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: input.aiAdvice,
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({ text: '' }),
              ]
            : []),
          // ===== 签字栏 =====
          new Paragraph({
            text: input.aiAdvice ? '六、签字栏' : '五、签字栏',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({ text: '审核律师: __________________   日期: ____ 年 ____ 月 ____ 日' }),
          new Paragraph({ text: '复核:     __________________   日期: ____ 年 ____ 月 ____ 日' }),
          new Paragraph({ text: '客户确认: ________________   日期: ____ 年 ____ 月 ____ 日' }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: '— 本摘要由 合规 SaaS 平台基于《行业分析方法论》自动生成; 详细审核记录见《合规审核底稿》 —',
                italics: true,
                size: 18,
                color: '808080',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function saveDocxToPublic(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const dir = path.join(process.cwd(), 'public', 'docs', 'generated');
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  return `/docs/generated/${filename}`;
}
