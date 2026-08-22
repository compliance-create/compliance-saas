// =====================================================
// LLM 统一客户端(支持多供应商,自动切换)
//
// 当前支持:
// - GLM (智谱):  https://open.bigmodel.cn/api/paas/v4
//   兼容 OpenAI Chat 协议
//   多模态: glm-4v-plus (图像 OCR / 理解)
// - DeepSeek:    https://api.deepseek.com/v1 (标准 OpenAI 协议)
//
// 切换供应商: 改 LLM_PROVIDER 环境变量
// 未来加新供应商: 只需在 PROVIDERS 加一项
// =====================================================

// 单模态: 纯文本
export type TextMsg = { role: 'system' | 'user' | 'assistant'; content: string };
// 多模态: content 是数组(text + image_url)
export type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
export type MultiMsg = { role: 'system' | 'user' | 'assistant'; content: ContentPart[] | string };
export type ChatMsg = TextMsg | MultiMsg;
type ChatOpts = { model?: string; temperature?: number; maxTokens?: number; signal?: AbortSignal };

type Provider = {
  name: string;
  baseUrl: string;
  apiKey: string | undefined;
  defaultModel: string;
  visionModel: string | null;
  // 把统一格式转成 provider 自己的请求体
  buildRequest: (msgs: ChatMsg[], model: string, opts: ChatOpts) => unknown;
  // 从 provider 响应里提取 text
  extractText: (data: any) => string;
};

const PROVIDERS: Record<string, Provider> = {
  glm: {
    name: 'glm',
    baseUrl: process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: process.env.GLM_API_KEY,
    defaultModel: process.env.GLM_MODEL ?? 'glm-4-flash',
    visionModel: 'glm-4v-plus',
    buildRequest: (msgs, model, opts) => ({
      model,
      messages: msgs,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
      stream: false,
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content ?? '',
  },
  deepseek: {
    name: 'deepseek',
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY,
    defaultModel: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    visionModel: null, // DeepSeek 暂不支持图像
    buildRequest: (msgs, model, opts) => ({
      model,
      messages: msgs,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
      stream: false,
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content ?? '',
  },
};

function getProvider(): Provider {
  const name = process.env.LLM_PROVIDER ?? 'glm';
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown LLM provider: ${name}`);
  if (!p.apiKey) {
    throw new Error(
      `${name.toUpperCase()}_API_KEY 未配置。 请在 .env 填入有效 key, 或改 LLM_PROVIDER 切换到已配置的供应商。`,
    );
  }
  return p;
}

export class LLMUnavailableError extends Error {
  constructor(public provider: string, public reason: string) {
    super(`LLM (${provider}) 不可用: ${reason}`);
  }
}

export async function chat(
  messages: ChatMsg[],
  opts: ChatOpts = {},
): Promise<string> {
  const p = getProvider();
  const model = opts.model ?? p.defaultModel;
  const body = p.buildRequest(messages, model, opts);
  const url = `${p.baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new LLMUnavailableError(p.name, 'API key 无效或余额不足');
    }
    if (res.status === 429) {
      throw new LLMUnavailableError(p.name, '限流, 请稍后重试');
    }
    throw new Error(`LLM (${p.name}) HTTP ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as any;
  return p.extractText(data);
}

// 图像理解/OCR: 用多模态模型
export async function chatWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const p = getProvider();
  if (!p.visionModel) {
    throw new LLMUnavailableError(p.name, '当前 LLM 不支持图像 (请切换到 GLM)');
  }
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const messages: ChatMsg[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ];
  const body = p.buildRequest(messages, p.visionModel, opts);
  const url = `${p.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Vision LLM HTTP ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as any;
  return p.extractText(data);
}

export function llmProviderName(): string {
  return process.env.LLM_PROVIDER ?? 'glm';
}
