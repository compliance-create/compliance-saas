// =====================================================
// 模块抽象: 所有模块(劳动/合同/未来税法)都实现这个接口
// 加新模块只需: 1) 新建 lib/modules/<slug>.ts
//              2) 在 lib/modules/registry.ts 注册
//              3) 提供内容 JSON (data/<slug>-items.ts)
// =====================================================

export type ModuleDefinition = {
  slug: string;
  name: string;
  category: string;
  description: string;
  iconName: string;
  orderIndex: number;
  enabled: boolean;
};

export type ChecklistItemSeed = {
  chapter: string;
  chapterTitle: string;
  orderIndex: number;
  title: string;
  keyPoints: string;
  legalBasis: string[];
  riskLevel: 'HIGH' | 'MID' | 'LOW';
  impactKey?: string;
  answerSchema: Record<string, unknown>;
};
