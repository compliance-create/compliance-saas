// =====================================================
// 行业方法论量化引擎
//
// 输入: 审核点回答 + 行业假设
// 输出: 折算的"年化现金流损失"(单位:分)
//
// 方法论基础: DCF + 自由现金流 + 折现率(详见 lib/data/method.ts)
// 量化逻辑: 把每一项合规风险折算为"对年度自由现金流的扣减项"
//
// 为后期新模块(税法/数据合规)预留: 只要新增 impactRule 注册即可
// =====================================================

export type IndustryAssumption = {
  revenueCents: number; // 年营收
  grossMargin: number; // 0~1
  headcount: number; // 员工数
  avgSalaryCents: number; // 平均月薪(分)
  industryCode: string; // 行业代码
  // 衍生指标
  estimatedGrossProfitCents: number; // 毛利 = 营收 * 毛利率
  estimatedNetProfitCents: number; // 净利(粗估:毛利 * 0.4)
};

export const FOLD = {
  // 估算公司净利率:毛利 * 净利率系数
  // 来源: 行业方法论第十二部分 - 自由现金流估算框架
  netMarginOfGross: 0.4,
  // 折现率(行业方法论推荐 8-9%)
  discountRate: 0.09,
  // 永续增长率(对应方法论"净产出的稳定增长率")
  perpetualGrowth: 0.03,
};

export function deriveAssumptions(input: {
  revenueCents: number;
  grossMargin: number;
  headcount: number;
  avgSalaryCents: number;
  industryCode: string;
}): IndustryAssumption {
  const grossProfit = Math.round(input.revenueCents * input.grossMargin);
  const netProfit = Math.round(grossProfit * FOLD.netMarginOfGross);
  return {
    revenueCents: input.revenueCents,
    grossMargin: input.grossMargin,
    headcount: input.headcount,
    avgSalaryCents: input.avgSalaryCents,
    industryCode: input.industryCode,
    estimatedGrossProfitCents: grossProfit,
    estimatedNetProfitCents: netProfit,
  };
}

export type AnswerInput = Record<string, unknown>;

export type ImpactContext = {
  assumption: IndustryAssumption;
  answer: AnswerInput;
  riskLevel: 'HIGH' | 'MID' | 'LOW';
};

export type ImpactResult = {
  impactCents: number; // 年化损失(分),正数表示"损失"
  narrative: string; // 文字解释
  // 折算到公司层面(基于方法论第十四部分公式)
  revenueImpactPct: number; // 占营收比
  profitImpactPct: number; // 占净利比
};

export type ImpactRule = {
  key: string;
  module: string; // labour | contract | tax | ...
  description: string;
  formula: string; // 公式展示
  compute: (ctx: ImpactContext) => { impactCents: number; narrative: string };
};

// 行业方法论引擎核心:
// V = Σ(Dt / (1+r)^t)
// 把"一年损失"折现成"对当期净产出的影响"

// =====================================================
// 劳动合规模块的量化规则
// =====================================================
export const labourImpactRules: ImpactRule[] = [
  {
    key: 'no_written_contract',
    module: 'labour',
    description: '未签/超期未签书面劳动合同, 需支付二倍工资',
    formula: 'impact = headcount × 月薪 × 应赔月数',
    compute: ({ assumption, answer }) => {
      const months = Number(answer.monthsWithoutContract ?? 0);
      const headcount = Number(answer.affectedHeadcount ?? assumption.headcount);
      const impact = Math.round(assumption.avgSalaryCents * months * headcount);
      return {
        impactCents: impact,
        narrative: `未签书面合同 ${months} 个月 × ${headcount} 人 × 月薪, 需支付二倍工资差额`,
      };
    },
  },
  {
    key: 'social_insurance_shortfall',
    module: 'labour',
    description: '未足额缴纳社会保险, 补缴+滞纳金+罚款',
    formula: 'impact = headcount × 月薪 × 缴费基数比例 × (1+滞纳金系数) × 12',
    compute: ({ assumption, answer }) => {
      const headcount = Number(answer.affectedHeadcount ?? assumption.headcount);
      const baseRatio = Number(answer.shortfallRatio ?? 0.3);
      const yearsUnpaid = Number(answer.yearsUnpaid ?? 1);
      const impact = Math.round(
        assumption.avgSalaryCents * 12 * baseRatio * yearsUnpaid * headcount,
      );
      return {
        impactCents: impact,
        narrative: `社保欠缴 ${yearsUnpaid} 年 × ${headcount} 人 × 月薪基数 × ${baseRatio * 100}% 缴费比`,
      };
    },
  },
  {
    key: 'overtime_underpay',
    module: 'labour',
    description: '加班工资未足额支付(150%/200%/300%)',
    formula: 'impact = headcount × 月薪 × 月加班比例 × 差额系数 × 12',
    compute: ({ assumption, answer }) => {
      const headcount = Number(answer.affectedHeadcount ?? assumption.headcount);
      const monthlyOvertimeHours = Number(answer.monthlyOvertimeHours ?? 20);
      const hourlyRate = assumption.avgSalaryCents / 174; // 月薪 / 174h(月均工时)
      const underpayRatio = Number(answer.underpayRatio ?? 0.5);
      // 假设全部按 1.5 倍应付,实际只付了 1.0 倍
      const monthlyLoss = monthlyOvertimeHours * hourlyRate * 0.5 * underpayRatio * headcount;
      const impact = Math.round(monthlyLoss * 12);
      return {
        impactCents: impact,
        narrative: `月均加班 ${monthlyOvertimeHours}h × ${headcount} 人 × 时薪 × 50% 差额, 年度累计`,
      };
    },
  },
  {
    key: 'illegal_dismissal',
    module: 'labour',
    description: '违法解除/终止劳动合同, 需支付 2N 经济补偿',
    formula: 'impact = headcount × 月薪 × 工龄系数 × 2',
    compute: ({ assumption, answer }) => {
      const headcount = Number(answer.affectedHeadcount ?? 1);
      const avgTenureYears = Number(answer.avgTenureYears ?? 3);
      const impact = Math.round(
        assumption.avgSalaryCents * avgTenureYears * 2 * headcount,
      );
      return {
        impactCents: impact,
        narrative: `违法解除 ${headcount} 人 × 平均工龄 ${avgTenureYears} 年 × 2N 赔偿`,
      };
    },
  },
  {
    key: 'workplace_injury',
    module: 'labour',
    description: '未参保工伤保险 / 安全措施缺失, 工伤赔付',
    formula: 'impact = headcount × 工伤年发生率 × 一次性伤残补助 + 停工留薪期工资',
    compute: ({ assumption, answer }) => {
      const headcount = Number(answer.affectedHeadcount ?? assumption.headcount);
      const injuryRate = Number(answer.annualInjuryRate ?? 0.005);
      const avgCompensation = Number(answer.avgCompensationCents ?? 20000000); // 默认 20 万/人
      const impact = Math.round(headcount * injuryRate * avgCompensation);
      return {
        impactCents: impact,
        narrative: `${headcount} 人 × 工伤年发生率 ${injuryRate * 100}% × 人均赔付`,
      };
    },
  },
  {
    key: 'probation_violation',
    module: 'labour',
    description: '试用期约定违法(超期/低于 80% 工资)',
    formula: 'impact = headcount × 月薪差额 × 试用期月数',
    compute: ({ assumption, answer }) => {
      const headcount = Number(answer.affectedHeadcount ?? 1);
      const probationMonths = Number(answer.probationMonths ?? 1);
      const wageGapRatio = Number(answer.wageGapRatio ?? 0.2);
      const impact = Math.round(
        assumption.avgSalaryCents * wageGapRatio * probationMonths * headcount,
      );
      return {
        impactCents: impact,
        narrative: `试用期 ${probationMonths} 月 × ${headcount} 人 × 月薪 ${wageGapRatio * 100}% 差额`,
      };
    },
  },
  {
    key: 'collective_contract_missing',
    module: 'labour',
    description: '规章制度未经民主程序, 仲裁/诉讼中可能被认定无效',
    formula: 'impact = 败诉概率 × 单案平均赔偿',
    compute: ({ assumption, answer }) => {
      const expectedCases = Number(answer.expectedCasesPerYear ?? 2);
      const avgLoss = Number(answer.avgLossPerCaseCents ?? 500000); // 默认 5000 元/案
      const probability = Number(answer.loseProbability ?? 0.4);
      const impact = Math.round(expectedCases * avgLoss * probability);
      return {
        impactCents: impact,
        narrative: `年 ${expectedCases} 起案件 × ${probability * 100}% 败诉率 × 人均赔付`,
      };
    },
  },
  {
    key: 'personal_data_violation',
    module: 'labour',
    description: '员工个人信息违规处理(个保法), 行政处罚+赔偿',
    formula: 'impact = headcount × 单人年合规价值 × 违规系数',
    compute: ({ assumption, answer }) => {
      const headcount = Number(answer.affectedHeadcount ?? assumption.headcount);
      const penalty = Number(answer.possiblePenaltyCents ?? 5000000); // 5000 万封顶取保守值
      const probability = Number(answer.enforcementProbability ?? 0.1);
      const impact = Math.round(penalty * probability);
      return {
        impactCents: impact,
        narrative: `覆盖 ${headcount} 名员工, 个保法处罚期望值 = 罚款 × ${probability * 100}% 触发概率`,
      };
    },
  },
];

// =====================================================
// 合同审核模块的量化规则
// =====================================================
export const contractImpactRules: ImpactRule[] = [
  {
    key: 'invalid_contract_subject',
    module: 'contract',
    description: '对方签约主体不适格(无权/超越经营范围), 合同无效风险',
    formula: 'impact = 合同金额 × 履行不能概率',
    compute: ({ answer }) => {
      const contractAmount = Number(answer.contractAmountCents ?? 0);
      const voidProbability = Number(answer.voidProbability ?? 0.3);
      const impact = Math.round(contractAmount * voidProbability);
      return {
        impactCents: impact,
        narrative: `合同金额 ¥${(contractAmount / 100).toLocaleString()} × 无效概率 ${voidProbability * 100}%`,
      };
    },
  },
  {
    key: 'penalty_too_low',
    module: 'contract',
    description: '违约金/赔偿条款过低, 难以覆盖实际损失',
    formula: 'impact = 合同金额 × 实际损失率 × 差额比例',
    compute: ({ answer }) => {
      const contractAmount = Number(answer.contractAmountCents ?? 0);
      const expectedBreachRate = Number(answer.expectedBreachRate ?? 0.1);
      const actualLossRatio = Number(answer.actualLossRatio ?? 0.5);
      const penaltyCoverage = Number(answer.currentPenaltyCoverage ?? 0.1);
      const impact = Math.round(
        contractAmount * expectedBreachRate * Math.max(0, actualLossRatio - penaltyCoverage),
      );
      return {
        impactCents: impact,
        narrative: `合同金额 × 预期违约率 × (实际损失 ${actualLossRatio * 100}% - 当前违约金覆盖 ${penaltyCoverage * 100}%)`,
      };
    },
  },
  {
    key: 'unclear_jurisdiction',
    module: 'contract',
    description: '争议管辖约定不明, 管辖异议成本 + 败诉风险',
    formula: 'impact = 单案成本 × 预期案件数',
    compute: ({ answer }) => {
      const expectedCases = Number(answer.expectedCasesPerYear ?? 1);
      const costPerCase = Number(answer.costPerCaseCents ?? 200000); // 2 万/案(律师费+差旅)
      const extraLoss = Number(answer.extraLossPerCaseCents ?? 100000);
      const probability = Number(answer.jurisdictionIssueRate ?? 0.4);
      const impact = Math.round(expectedCases * (costPerCase + extraLoss) * probability);
      return {
        impactCents: impact,
        narrative: `年 ${expectedCases} 起 × 管辖异议成本 + 额外损失, 触发概率 ${probability * 100}%`,
      };
    },
  },
  {
    key: 'missing_performance_evidence',
    module: 'contract',
    description: '履行证据链缺失, 主张权利时举证不能',
    formula: 'impact = 合同金额 × 举证不能概率',
    compute: ({ answer }) => {
      const contractAmount = Number(answer.contractAmountCents ?? 0);
      const evidenceLossRate = Number(answer.evidenceLossRate ?? 0.2);
      const impact = Math.round(contractAmount * evidenceLossRate);
      return {
        impactCents: impact,
        narrative: `合同金额 × 举证不能风险 ${evidenceLossRate * 100}%`,
      };
    },
  },
  {
    key: 'statute_of_limitations',
    module: 'contract',
    description: '诉讼时效管理缺失, 债权过期',
    formula: 'impact = 应收账款余额 × 失效率',
    compute: ({ answer }) => {
      const receivableCents = Number(answer.receivableCents ?? 0);
      const lossRate = Number(answer.expectedLossRate ?? 0.05);
      const impact = Math.round(receivableCents * lossRate);
      return {
        impactCents: impact,
        narrative: `应收账款余额 × 失效率 ${lossRate * 100}%`,
      };
    },
  },
];

// =====================================================
// 注册中心 - 后期加新模块(税法/数据合规)只需 push 到这里
// =====================================================
export const impactRegistry: Record<string, ImpactRule> = [
  ...labourImpactRules,
  ...contractImpactRules,
].reduce((acc, r) => {
  acc[r.key] = r;
  return acc;
}, {} as Record<string, ImpactRule>);

export function getRule(impactKey: string | null | undefined): ImpactRule | null {
  if (!impactKey) return null;
  return impactRegistry[impactKey] ?? null;
}

// =====================================================
// 单点计算
// =====================================================
export function computeImpact(
  impactKey: string | null,
  riskLevel: 'HIGH' | 'MID' | 'LOW',
  assumption: IndustryAssumption,
  answer: AnswerInput,
): ImpactResult {
  const rule = getRule(impactKey);
  if (!rule) {
    // 兜底: 风险等级 × 营收的固定系数
    const fallback = fallbackByRisk(riskLevel, assumption);
    return {
      impactCents: fallback,
      narrative: `按风险等级粗估(未配置具体量化公式)`,
      revenueImpactPct: safeDiv(fallback, assumption.revenueCents),
      profitImpactPct: safeDiv(fallback, assumption.estimatedNetProfitCents),
    };
  }
  const { impactCents, narrative } = rule.compute({ assumption, answer, riskLevel });
  // 风险等级系数: HIGH 全额, MID 折半, LOW 四分之一
  const factor = riskLevel === 'HIGH' ? 1 : riskLevel === 'MID' ? 0.5 : 0.25;
  const adjusted = Math.round(impactCents * factor);
  return {
    impactCents: adjusted,
    narrative: `${narrative}; 风险系数 ${factor} (${riskLevel})`,
    revenueImpactPct: safeDiv(adjusted, assumption.revenueCents),
    profitImpactPct: safeDiv(adjusted, assumption.estimatedNetProfitCents),
  };
}

function fallbackByRisk(risk: 'HIGH' | 'MID' | 'LOW', a: IndustryAssumption): number {
  // 占净利 0.5% / 0.1% / 0.02%
  const ratio = risk === 'HIGH' ? 0.005 : risk === 'MID' ? 0.001 : 0.0002;
  return Math.round(a.estimatedNetProfitCents * ratio);
}

function safeDiv(a: number, b: number): number {
  if (!b) return 0;
  return a / b;
}

// =====================================================
// 汇总: AuditRun 一次跑完所有审核点
// =====================================================
export type SummaryInput = {
  assumption: IndustryAssumption;
  items: Array<{
    impactKey: string | null;
    riskLevel: 'HIGH' | 'MID' | 'LOW';
    answer: AnswerInput;
  }>;
};

export function summarizeRun(input: SummaryInput) {
  let total = 0;
  let high = 0;
  let mid = 0;
  let low = 0;
  const breakdown: Array<{ impactKey: string | null; riskLevel: string; result: ImpactResult }> = [];
  for (const it of input.items) {
    const result = computeImpact(it.impactKey, it.riskLevel, input.assumption, it.answer);
    total += result.impactCents;
    if (it.riskLevel === 'HIGH') high++;
    else if (it.riskLevel === 'MID') mid++;
    else low++;
    breakdown.push({ impactKey: it.impactKey, riskLevel: it.riskLevel, result });
  }
  return {
    totalImpactCents: total,
    highRiskCount: high,
    midRiskCount: mid,
    lowRiskCount: low,
    revenueImpactPct: safeDiv(total, input.assumption.revenueCents),
    profitImpactPct: safeDiv(total, input.assumption.estimatedNetProfitCents),
    breakdown,
  };
}
