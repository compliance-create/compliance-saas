// 模块注册中心 - 后期加税法/数据合规/财务模块,只在这里 push
import type { ModuleDefinition } from './base';

export const modules: ModuleDefinition[] = [
  {
    slug: 'labour',
    name: '劳动用工合规',
    category: 'labour',
    description: '基于《劳动法》《劳动合同法》,按用工全生命周期 12 章 79 项审核点,识别高风险事项并量化对营收/利润的影响。',
    iconName: 'Users',
    orderIndex: 1,
    enabled: true,
  },
  {
    slug: 'contract',
    name: '合同合规审核',
    category: 'contract',
    description: '基于《民法典》《民事诉讼法》,覆盖合同主体、形式、条款、效力、违约、争议六大维度,生成高管级审核摘要。',
    iconName: 'FileSignature',
    orderIndex: 2,
    enabled: true,
  },
  {
    slug: 'tax',
    name: '税务合规',
    category: 'tax',
    description: '增值税、企业所得税、个人所得税、社保入税等场景的合规审核与现金流影响分析(规划中)。',
    iconName: 'Landmark',
    orderIndex: 3,
    enabled: false, // 后期上线
  },
];
