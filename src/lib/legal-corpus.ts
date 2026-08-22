// =====================================================
// 法条 RAG 库(精选高频)
// =====================================================
// 完整法条库在 DB 里 197 项, 这里精选 30 条最高频的,塞进 system prompt
// 让 LLM 知道这些法条存在, 用户问具体合规问题时能直接引用法条编号

export type LegalEntry = {
  id: string; // 法条编号
  title: string; // 一句话标题
  text: string; // 法条原文(节选)
  source: string; // 出处
  category: 'labour' | 'contract' | 'tax' | 'general';
};

// 精选 30 条最高频(基于小微企业最常遇到的问题)
export const legalCorpus: LegalEntry[] = [
  // ===== 劳动法核心 =====
  {
    id: '劳动合同法-第10条',
    title: '书面劳动合同的签订时限',
    text: '建立劳动关系, 应当订立书面劳动合同。已建立劳动关系, 未同时订立书面劳动合同的, 应当自用工之日起一个月内订立书面劳动合同。',
    source: '《劳动合同法》第10条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第82条',
    title: '未签合同二倍工资',
    text: '用人单位自用工之日起超过一个月不满一年未与劳动者订立书面劳动合同的, 应当向劳动者每月支付二倍的工资。',
    source: '《劳动合同法》第82条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第38条',
    title: '劳动者被迫解除合同(用人单位过错)',
    text: '用人单位有下列情形之一的, 劳动者可以解除劳动合同: (一)未按照劳动合同约定提供劳动保护或者劳动条件的; (二)未及时足额支付劳动报酬的; (三)未依法为劳动者缴纳社会保险费的; ...',
    source: '《劳动合同法》第38条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第39条',
    title: '用人单位单方解除(过错性辞退)',
    text: '劳动者有下列情形之一的, 用人单位可以解除劳动合同: (一)在试用期间被证明不符合录用条件的; (二)严重违反用人单位的规章制度的; (三)严重失职, 营私舞弊, 给用人单位造成重大损害的; ...',
    source: '《劳动合同法》第39条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第40条',
    title: '非过错性辞退(医疗期/不胜任/客观变化)',
    text: '有下列情形之一的, 用人单位提前三十日以书面形式通知劳动者本人或者额外支付劳动者一个月工资后, 可以解除劳动合同: (一)劳动者患病或者非因工负伤, 在规定的医疗期满后不能从事原工作, 也不能从事用人单位另行安排的工作的; (二)劳动者不能胜任工作, 经过培训或者调整工作岗位, 仍不能胜任工作的; (三)劳动合同订立时所依据的客观情况发生重大变化, 致使劳动合同无法履行, 经用人单位与劳动者协商, 未能就变更劳动合同内容达成协议的。',
    source: '《劳动合同法》第40条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第41条',
    title: '经济性裁员',
    text: '有下列情形之一, 需要裁减人员二十人以上或者裁减不足二十人但占企业职工总数百分之十以上的, 用人单位提前三十日向工会或者全体职工说明情况, 听取工会或者职工的意见后, 裁减人员方案经向劳动行政部门报告, 可以裁减人员: ...',
    source: '《劳动合同法》第41条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第47条',
    title: '经济补偿的计算',
    text: '经济补偿按劳动者在本单位工作的年限, 每满一年支付一个月工资的标准向劳动者支付。六个月以上不满一年的, 按一年计算; 不满六个月的, 向劳动者支付半个月工资的经济补偿。',
    source: '《劳动合同法》第47条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第87条',
    title: '违法解除/终止的赔偿金',
    text: '用人单位违反本法规定解除或者终止劳动合同的, 应当依照本法第四十七条规定的经济补偿标准的二倍向劳动者支付赔偿金。',
    source: '《劳动合同法》第87条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第19条',
    title: '试用期长度',
    text: '劳动合同期限三个月以上不满一年的, 试用期不得超过一个月; 一年以上不满三年的, 不得超过二个月; 三年以上固定期限和无固定期限的, 不得超过六个月。',
    source: '《劳动合同法》第19条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第20条',
    title: '试用期工资',
    text: '劳动者在试用期的工资不得低于本单位相同岗位最低档工资或者劳动合同约定工资的百分之八十, 并不得低于用人单位所在地的最低工资标准。',
    source: '《劳动合同法》第20条',
    category: 'labour',
  },
  {
    id: '劳动法-第44条',
    title: '加班工资标准',
    text: '有下列情形之一的, 用人单位应当按照下列标准支付高于劳动者正常工作时间工资的工资报酬: (一)安排劳动者延长工作时间的, 支付不低于工资的百分之一百五十的工资报酬; (二)休息日安排劳动者工作又不能安排补休的, 支付不低于工资的百分之二百的工资报酬; (三)法定休假日安排劳动者工作的, 支付不低于工资的百分之三百的工资报酬。',
    source: '《劳动法》第44条',
    category: 'labour',
  },
  {
    id: '劳动法-第41条',
    title: '加班时间上限',
    text: '用人单位由于生产经营需要, 经与工会和劳动者协商后可以延长工作时间, 一般每日不得超过一小时; 因特殊原因需要延长工作时间的, 在保障劳动者身体健康的条件下延长工作时间每日不得超过三小时; 但是每月不得超过三十六小时。',
    source: '《劳动法》第41条',
    category: 'labour',
  },
  {
    id: '劳动法-第50条',
    title: '工资应以人民币按月支付',
    text: '工资应当以货币形式按月支付给劳动者本人。不得克扣或者无故拖欠劳动者的工资。',
    source: '《劳动法》第50条',
    category: 'labour',
  },
  {
    id: '社会保险法-第58条',
    title: '用人单位必须为员工参保',
    text: '用人单位应当自用工之日起三十日内为其职工向社会保险经办机构申请办理社会保险登记。未办理社会保险登记的, 由社会保险经办机构核定其应当缴纳的社会保险费。',
    source: '《社会保险法》第58条',
    category: 'labour',
  },
  {
    id: '工伤保险条例-第17条',
    title: '工伤认定申请',
    text: '职工发生事故伤害或者按照职业病防治法规定被诊断、鉴定为职业病, 所在单位应当自事故伤害发生之日或者被诊断、鉴定为职业病之日起30日内, 向统筹地区社会保险行政部门提出工伤认定申请。',
    source: '《工伤保险条例》第17条',
    category: 'labour',
  },
  {
    id: '女职工劳动保护-第7条',
    title: '产假天数(98天基础)',
    text: '女职工生育享受98天产假, 其中产前可以休假15天; 难产的, 增加产假15天; 生育多胞胎的, 每多生育1个婴儿, 增加产假15天。',
    source: '《女职工劳动保护特别规定》第7条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第22条',
    title: '专项培训违约金',
    text: '用人单位为劳动者提供专项培训费用, 对其进行专业技术培训的, 可以与该劳动者订立协议, 约定服务期。劳动者违反服务期约定的, 应当按照约定向用人单位支付违约金。违约金的数额不得超过用人单位提供的培训费用。',
    source: '《劳动合同法》第22条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第23条',
    title: '竞业限制',
    text: '用人单位与劳动者可以在劳动合同中约定保守用人单位的商业秘密和与知识产权相关的保密事项。对负有保密义务的劳动者, 用人单位可以在劳动合同或者保密协议中与劳动者约定竞业限制条款, 并约定在解除或者终止劳动合同后, 在竞业限制期限内按月给予劳动者经济补偿。',
    source: '《劳动合同法》第23条',
    category: 'labour',
  },
  {
    id: '劳动合同法-第24条',
    title: '竞业限制人员范围与期限',
    text: '竞业限制的人员限于用人单位的高级管理人员、高级技术人员和其他负有保密义务的人员。竞业限制的范围、地域、期限由用人单位与劳动者约定, 竞业限制的约定不得违反法律、法规的规定。',
    source: '《劳动合同法》第24条',
    category: 'labour',
  },
  {
    id: '个人所得税法-第9条',
    title: '个税扣缴义务',
    text: '个人所得税以所得人为纳税人, 以支付所得的单位或者个人为扣缴义务人。',
    source: '《个人所得税法》第9条',
    category: 'tax',
  },

  // ===== 合同法核心 =====
  {
    id: '民法典-第502条',
    title: '合同生效原则',
    text: '依法成立的合同, 自成立时生效, 但是法律另有规定或者当事人另有约定的除外。依照法律、行政法规的规定, 合同应当办理批准等手续的, 依照其规定。',
    source: '《民法典》第502条',
    category: 'contract',
  },
  {
    id: '民法典-第504条',
    title: '越权代表的效力',
    text: '法人的法定代表人或者非法人组织的负责人超越权限订立的合同, 除相对人知道或者应当知道其超越权限外, 该合同对法人或者非法人组织发生效力。',
    source: '《民法典》第504条',
    category: 'contract',
  },
  {
    id: '民法典-第510条',
    title: '约定不明处理',
    text: '合同生效后, 当事人就质量、价款或者报酬、履行地点等内容没有约定或者约定不明确的, 可以协议补充; 不能达成补充协议的, 按照合同相关条款或者交易习惯确定。',
    source: '《民法典》第510条',
    category: 'contract',
  },
  {
    id: '民法典-第533条',
    title: '情势变更',
    text: '合同成立后, 合同的基础条件发生了当事人在订立合同时无法预见的、不属于商业风险的重大变化, 继续履行合同对于当事人一方明显不公平的, 受不利影响的当事人可以与对方重新协商; 在合理期限内协商不成的, 当事人可以请求人民法院或者仲裁机构变更或者解除合同。',
    source: '《民法典》第533条',
    category: 'contract',
  },
  {
    id: '民法典-第585条',
    title: '违约金调整',
    text: '当事人可以约定一方违约时应当根据违约情况向对方支付一定数额的违约金, 也可以约定因违约产生的损失赔偿额的计算方法。约定的违约金低于造成的损失的, 人民法院或者仲裁机构可以根据当事人的请求予以增加; 约定的违约金过分高于造成的损失的, 人民法院或者仲裁机构可以根据当事人的请求予以适当减少。',
    source: '《民法典》第585条',
    category: 'contract',
  },
  {
    id: '民法典-第586条',
    title: '定金规则(不超过20%)',
    text: '当事人可以约定一方向对方给付定金作为债权的担保。定金合同自实际交付定金时成立。定金的数额由当事人约定; 但是, 不得超过主合同标的额的百分之二十, 超过部分不产生定金的效力。',
    source: '《民法典》第586条',
    category: 'contract',
  },
  {
    id: '民法典-第590条',
    title: '不可抗力',
    text: '当事人一方因不可抗力不能履行合同的, 根据不可抗力的影响, 部分或者全部免除责任, 但是法律另有规定的除外。当事人迟延履行后发生不可抗力的, 不免除其违约责任。',
    source: '《民法典》第590条',
    category: 'contract',
  },
  {
    id: '民法典-第188条',
    title: '诉讼时效(3年)',
    text: '向人民法院请求保护民事权利的诉讼时效期间为三年。法律另有规定的, 依照其规定。诉讼时效期间自权利人知道或者应当知道权利受到损害以及义务人之日起计算。',
    source: '《民法典》第188条',
    category: 'contract',
  },
  {
    id: '民诉法-第35条',
    title: '协议管辖',
    text: '合同或者其他财产权益纠纷的当事人可以书面协议选择被告住所地、合同履行地、合同签订地、原告住所地、标的物所在地等与争议有实际联系的地点的人民法院管辖, 但不得违反本法对级别管辖和专属管辖的规定。',
    source: '《民事诉讼法》第35条',
    category: 'contract',
  },
  {
    id: '民诉法-第246条',
    title: '申请执行期间(3年)',
    text: '申请执行的期间为三年。申请执行期间的中止、中断, 适用法律有关诉讼时效中止、中断的规定。',
    source: '《民事诉讼法》第246条',
    category: 'contract',
  },
];

// 拼成 system prompt 的一部分(全量, 调试用)
export function buildLegalCorpusPrompt(entries: LegalEntry[] = legalCorpus): string {
  if (entries.length === 0) return '';
  const blocks = entries.map(
    (e) =>
      `【${e.id}】${e.title}\n${e.text}\n`,
  );
  return `\n# 中国法律参考库(精选)\n以下是常见小微企业合规场景的中国法律法规节选(共 ${entries.length} 条)。回答用户具体合规问题时, 必须引用对应法条编号(用【】包裹)以增强可信度。\n\n${blocks.join('\n')}`;
}

// =====================================================
// Embedding-based RAG
// 启动时算一次所有法条的 embedding, 缓存到 globalThis
// 用户问问题时, 算问题 embedding, 找最相关的 top-K
// =====================================================

type Embedding = number[];

// 缓存所有法条 embedding
let corpusCache: { entry: LegalEntry; embedding: Embedding }[] | null = null;
let initPromise: Promise<void> | null = null;

export async function ensureCorpusEmbeddings(): Promise<void> {
  if (corpusCache) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const { getEmbedding } = await import('./embeddings');
      const results: { entry: LegalEntry; embedding: Embedding }[] = [];
      for (const e of legalCorpus) {
        const text = `${e.title}. ${e.text}`;
        const emb = await getEmbedding(text);
        results.push({ entry: e, embedding: emb });
      }
      corpusCache = results;
      console.log(`[legal-corpus] embeddings ready: ${results.length} entries`);
    } catch (e) {
      console.error('[legal-corpus] embedding init failed, fallback to full corpus', e);
    }
  })();
  return initPromise;
}

function cosineSim(a: Embedding, b: Embedding): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

/**
 * 检索最相关的 top-K 法条
 * 如果 embedding 不可用, 降级到全量
 */
export async function retrieveRelevantLaws(
  question: string,
  topK: number = 5,
): Promise<LegalEntry[]> {
  if (!corpusCache) {
    // 尝试初始化(失败也无所谓)
    await ensureCorpusEmbeddings().catch(() => {});
  }
  if (!corpusCache || corpusCache.length === 0) {
    return legalCorpus.slice(0, topK);
  }
  try {
    const { getEmbedding } = await import('./embeddings');
    const qEmb = await getEmbedding(question);
    const scored = corpusCache.map((c) => ({
      entry: c.entry,
      score: cosineSim(qEmb, c.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.entry);
  } catch {
    return legalCorpus.slice(0, topK);
  }
}
