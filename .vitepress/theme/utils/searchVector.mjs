// 运行时向量搜索：懒加载 transformers.js + bge-small-zh 模型 + embeddings.json。
// 入口暴露 enableVectorSearch / vectorSearch 两个函数。
// 模型权重首次加载 ~23MB，后续走浏览器 HTTP 缓存。

const MODEL_ID = "Xenova/bge-small-zh-v1.5";
const MODEL_BASE = "/models/"; // public/models/ 下
const EMBEDDINGS_URL = "/embeddings.json";

let extractor = null; // 模型 pipeline 实例
let postEmbeddings = null; // [{ id, url, title, vector: number[] }]
let loadingPromise = null; // 防止并发重复加载
let progressCb = null;

const reportProgress = (stage, percent) => {
  if (progressCb) progressCb({ stage, percent });
};

const cosine = (a, b) => {
  // a, b 都已归一化，余弦相似度 = 点积
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
};

/**
 * 启用向量搜索：加载 transformers 包、模型文件、embeddings。
 * @param {(p: {stage: string, percent: number}) => void} onProgress
 */
export const enableVectorSearch = async (onProgress) => {
  if (extractor && postEmbeddings) return true;
  if (loadingPromise) return loadingPromise;
  progressCb = onProgress || null;

  loadingPromise = (async () => {
    reportProgress("downloading-runtime", 0);
    const { pipeline, env } = await import("@huggingface/transformers");
    env.localModelPath = MODEL_BASE;
    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    reportProgress("downloading-runtime", 30);

    reportProgress("downloading-model", 30);
    extractor = await pipeline("feature-extraction", MODEL_ID, { dtype: "q8" });
    reportProgress("downloading-model", 80);

    reportProgress("downloading-index", 80);
    const res = await fetch(EMBEDDINGS_URL);
    if (!res.ok) throw new Error(`无法加载 ${EMBEDDINGS_URL}: ${res.status}`);
    const payload = await res.json();
    postEmbeddings = payload.posts;
    reportProgress("ready", 100);
    return true;
  })();

  try {
    return await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    extractor = null;
    postEmbeddings = null;
    throw err;
  }
};

export const isVectorReady = () => extractor !== null && postEmbeddings !== null;

/**
 * 用向量搜索返回 topK 相似文章。
 * @param {string} query
 * @param {{ topK?: number, threshold?: number }} opts
 * @returns {Promise<Array<{ url, title, similarity }>>}
 */
export const vectorSearch = async (query, opts = {}) => {
  if (!extractor || !postEmbeddings) {
    throw new Error("向量搜索未初始化，请先调用 enableVectorSearch()");
  }
  const { topK = 10, threshold = 0.55 } = opts;
  const trimmed = (query || "").trim();
  if (!trimmed) return [];

  const output = await extractor(trimmed, { pooling: "mean", normalize: true });
  const qVec = Array.from(output.data);

  const scored = [];
  for (const p of postEmbeddings) {
    const sim = cosine(qVec, p.vector);
    if (sim >= threshold) scored.push({ id: p.id, url: p.url, title: p.title, similarity: sim });
  }
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
};
