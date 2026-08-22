// =====================================================
// 报告 PDF 生成器(@react-pdf/renderer, 无浏览器依赖)
//
// 优势对比 docx:
// - 老板常用 PDF(打印、签字、转发)
// - 排版可控,图表可嵌入
// - CloudBase 云函数可直接运行(无需 chromium)
//
// 与 doc-generator.ts 共享数据组装逻辑
// =====================================================

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import React from 'react';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const colors = {
  high: '#dc2626',
  mid: '#f59e0b',
  low: '#16a34a',
  red: '#dc2626',
  yellow: '#f59e0b',
  green: '#16a34a',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  brand: '#2f7eff',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: colors.text,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
  },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  subtitle: { fontSize: 10, color: colors.textMuted },
  meta: { fontSize: 9, color: colors.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 8,
    color: colors.brand,
  },
  ratingBox: {
    marginVertical: 12,
    padding: 12,
    borderRadius: 6,
    textAlign: 'center',
  },
  ratingText: { fontSize: 16, fontWeight: 700 },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  gridCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 8,
  },
  cellLabel: { fontSize: 8, color: colors.textMuted, marginBottom: 2 },
  cellValue: { fontSize: 13, fontWeight: 700 },
  cellValueHigh: { color: colors.high },
  cellValueMid: { color: colors.mid },
  cellValueLow: { color: colors.low },
  bullet: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: { marginRight: 6, color: colors.brand },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    fontSize: 8.5,
    fontWeight: 700,
    color: colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowLast: { borderBottomWidth: 0 },
  riskBadge: {
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: colors.textMuted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
});

const colWidths = {
  chapter: '6%',
  risk: '7%',
  title: '25%',
  answer: '24%',
  legal: '23%',
  impact: '15%',
};

type Item = {
  chapter: string;
  chapterTitle: string;
  title: string;
  riskLevel: string;
  keyPoints: string;
  legalBasis: string;
  answer: string;
  impactCents?: number | undefined;
  impactNarrative?: string | undefined;
};

export type PdfReportInput = {
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
  sections: Array<{ chapterTitle: string; items: Item[] }>;
  summaryBullets: string[];
  aiAdvice?: string;
};

function yuan(cents: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function RiskBadge({ level }: { level: string }) {
  const bg =
    level === 'HIGH' ? '#fee2e2' : level === 'MID' ? '#fef3c7' : '#dcfce7';
  const color =
    level === 'HIGH' ? colors.high : level === 'MID' ? colors.mid : colors.low;
  const label = level === 'HIGH' ? '高' : level === 'MID' ? '中' : '低';
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingVertical: 2,
        paddingHorizontal: 5,
        borderRadius: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 8, fontWeight: 700, color }}>{label}</Text>
    </View>
  );
}

function PdfReport({ data }: { data: PdfReportInput }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          {data.subtitle && <Text style={styles.subtitle}>{data.subtitle}</Text>}
          <Text style={styles.meta}>
            委托方: {data.companyName}  |  模块: {data.moduleName}  |  报告日期:{' '}
            {data.generatedAt.toISOString().slice(0, 10)}
          </Text>
        </View>

        {/* 总体评级 */}
        <Text style={styles.sectionTitle}>一、总体评级</Text>
        <View
          style={[
            styles.ratingBox,
            {
              backgroundColor:
                data.rating === 'RED'
                  ? '#fef2f2'
                  : data.rating === 'YELLOW'
                    ? '#fffbeb'
                    : '#f0fdf4',
            },
          ]}
        >
          <Text
            style={[
              styles.ratingText,
              {
                color:
                  data.rating === 'RED'
                    ? colors.red
                    : data.rating === 'YELLOW'
                      ? colors.yellow
                      : colors.green,
              },
            ]}
          >
            {data.rating === 'RED'
              ? '🔴 高风险 · 建议立即整改'
              : data.rating === 'YELLOW'
                ? '🟡 中风险 · 修改后通过'
                : '🟢 低风险 · 可通过'}
          </Text>
        </View>

        {/* 量化结论 */}
        <Text style={styles.sectionTitle}>二、量化结论(基于《行业分析方法论》折算)</Text>
        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={styles.cellLabel}>高风险项</Text>
            <Text style={styles.cellValue}>{data.totals.high}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.cellLabel}>中风险项</Text>
            <Text style={[styles.cellValue, styles.cellValueMid]}>
              {data.totals.mid}
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.cellLabel}>低风险项</Text>
            <Text style={[styles.cellValue, styles.cellValueLow]}>
              {data.totals.low}
            </Text>
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={styles.cellLabel}>年化现金流损失</Text>
            <Text style={[styles.cellValue, styles.cellValueHigh]}>
              {yuan(data.totals.totalImpactCents)}
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.cellLabel}>占营收比</Text>
            <Text style={styles.cellValue}>{pct(data.totals.revenueImpactPct)}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.cellLabel}>占净利比</Text>
            <Text style={[styles.cellValue, styles.cellValueHigh]}>
              {pct(data.totals.profitImpactPct)}
            </Text>
          </View>
        </View>

        {/* 关键风险提示 */}
        <Text style={styles.sectionTitle}>三、关键风险提示</Text>
        {data.summaryBullets.map((b, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>■</Text>
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}

        {/* 详细审核 */}
        <Text style={styles.sectionTitle}>四、审核明细</Text>
        {data.sections.map((sec, idx) => (
          <View key={idx} style={{ marginBottom: 10 }} wrap={false}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 4,
                color: colors.text,
              }}
            >
              {sec.chapterTitle}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: colWidths.chapter }]}>
                  章节
                </Text>
                <Text style={[styles.tableHeaderCell, { width: colWidths.risk }]}>
                  风险
                </Text>
                <Text style={[styles.tableHeaderCell, { width: colWidths.title }]}>
                  事项
                </Text>
                <Text style={[styles.tableHeaderCell, { width: colWidths.answer }]}>
                  现场
                </Text>
                <Text style={[styles.tableHeaderCell, { width: colWidths.legal }]}>
                  依据
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { width: colWidths.impact, textAlign: 'right' },
                  ]}
                >
                  量化
                </Text>
              </View>
              {sec.items.map((it, i) => (
                <View
                  key={i}
                  style={[
                    styles.tableRow,
                    i === sec.items.length - 1 ? styles.tableRowLast : {},
                  ]}
                >
                  <Text style={{ width: colWidths.chapter, fontSize: 8.5 }}>
                    {it.chapter}
                  </Text>
                  <View style={{ width: colWidths.risk }}>
                    <RiskBadge level={it.riskLevel} />
                  </View>
                  <Text
                    style={{
                      width: colWidths.title,
                      fontSize: 8.5,
                      lineHeight: 1.4,
                    }}
                  >
                    {it.title}
                  </Text>
                  <Text
                    style={{
                      width: colWidths.answer,
                      fontSize: 8.5,
                      lineHeight: 1.4,
                    }}
                  >
                    {it.answer}
                  </Text>
                  <Text
                    style={{
                      width: colWidths.legal,
                      fontSize: 8,
                      color: colors.textMuted,
                      lineHeight: 1.3,
                    }}
                  >
                    {it.legalBasis}
                  </Text>
                  <View style={{ width: colWidths.impact, alignItems: 'flex-end' }}>
                    {it.impactCents ? (
                      <>
                        <Text
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: colors.high,
                          }}
                        >
                          {yuan(it.impactCents)}
                        </Text>
                        {it.impactNarrative && (
                          <Text
                            style={{
                              fontSize: 7,
                              color: colors.textMuted,
                              marginTop: 2,
                            }}
                          >
                            {it.impactNarrative}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={{ fontSize: 8, color: colors.textMuted }}>—</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* AI 战略建议(可选) */}
        {data.aiAdvice && (
          <>
            <Text style={styles.sectionTitle}>五、AI 战略建议</Text>
            <Text style={{ fontSize: 8, color: colors.textMuted, fontStyle: 'italic', marginBottom: 6 }}>
              由 AI 基于量化数据自动生成, 仅供参考, 不构成个案法律意见。
            </Text>
            <View
              style={{
                padding: 10,
                backgroundColor: '#f5f3ff',
                borderRadius: 4,
                borderLeftWidth: 3,
                borderLeftColor: colors.brand,
              }}
            >
              <Text style={{ fontSize: 9.5, lineHeight: 1.6, color: colors.text }}>
                {data.aiAdvice}
              </Text>
            </View>
            <Text style={{ marginBottom: 4 }}>{' '}</Text>
          </>
        )}

        {/* 签字栏 */}
        <Text style={styles.sectionTitle}>{data.aiAdvice ? '六、签字栏' : '五、签字栏'}</Text>
        <Text style={{ fontSize: 9.5, marginBottom: 4 }}>
          审核律师: _________________________   日期: ____ 年 ____ 月 ____ 日
        </Text>
        <Text style={{ fontSize: 9.5, marginBottom: 4 }}>
          复核:     _________________________   日期: ____ 年 ____ 月 ____ 日
        </Text>
        <Text style={{ fontSize: 9.5 }}>
          客户确认: _________________________   日期: ____ 年 ____ 月 ____ 日
        </Text>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          本报告由 合规 SaaS 平台基于《行业分析方法论》自动生成 · 详细审核记录见《合规审核底稿》
        </Text>
      </Page>
    </Document>
  );
}

export async function generateReportPdf(input: PdfReportInput): Promise<Buffer> {
  return renderToBuffer(<PdfReport data={input} />);
}

export async function savePdfToPublic(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const dir = path.join(process.cwd(), 'public', 'docs', 'generated');
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  return `/docs/generated/${filename}`;
}
