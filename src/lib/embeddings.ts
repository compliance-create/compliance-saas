// =====================================================
// Embedding 客户端 (GLM embedding-2)
// =====================================================

let apiKey = process.env.GLM_API_KEY;
let baseUrl = process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4';
let model = process.env.GLM_EMBEDDING_MODEL ?? 'embedding-2';

// 简单内存缓存(按文本 hash)
const cache = new Map<string, number[]>();

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return String(h);
}

export async function getEmbedding(text: string): Promise<number[]> {
  const key = hash(text);
  const cached = cache.get(key);
  if (cached) return cached;

  if (!apiKey || apiKey.startsWith('sk-OTU3') === false && apiKey.length < 20) {
    // 安全: 如果 key 看起来不像, 走 mock
    if (!apiKey) {
      throw new Error('GLM_API_KEY 未配置, embedding 不可用');
    }
  }
  const url = `${baseUrl}/embeddings`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text }),
  });
  if (!resp.ok) {
    throw new Error(`Embedding API ${resp.status}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as { data?: Array<{ embedding: number[] }> };
  const emb = data.data?.[0]?.embedding;
  if (!emb) throw new Error('Empty embedding response');
  cache.set(key, emb);
  return emb;
}
