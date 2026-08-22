// 与 src/app/api/* 共享的 TypeScript 类型
// 微信小程序 / H5 / 第三方均 import 这份类型

export type Module = {
  id: string;
  slug: 'labour' | 'contract' | 'tax';
  name: string;
  description: string;
  category: string;
};

export type ChecklistItem = {
  id: string;
  chapter: string;
  chapterTitle: string;
  orderIndex: number;
  title: string;
  keyPoints: string;
  legalBasis: string[];
  riskLevel: 'HIGH' | 'MID' | 'LOW';
  impactKey: string | null;
  answerSchema: Record<string, unknown>;
};

export type StartAuditInput = {
  moduleSlug: 'labour' | 'contract';
  revenueCents: number;
  grossMargin: number;
  headcount: number;
  avgSalaryCents: number;
  industryCode: string;
};

export type AuditAnswer = {
  itemId: string;
  answer: Record<string, unknown>;
};

export type Report = {
  id: string;
  rating: 'RED' | 'YELLOW' | 'GREEN';
  totalImpactCents: number;
  highRiskCount: number;
  midRiskCount: number;
  lowRiskCount: number;
  revenueImpactPct: number;
  profitImpactPct: number;
  generatedAt: string;
};

export type Subscription = {
  id: string;
  planCode: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  startedAt: string;
  expiresAt: string;
};
