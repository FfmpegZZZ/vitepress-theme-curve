// 运行时向量搜索：懒加载 transformers.js + bge-small-zh 模型 + embeddings.json。
// 入口暴露 enableVectorSearch / vectorSearch 两个函数。
// 模型权重首次加载 ~23MB，使用 HTTP Range 6 路分片并发下载以绕过 CDN 单连接限速。

const MODEL_ID = "Xenova/bge-small-zh-v1.5";
const MODEL_BASE = "/models/"; // public/models/ 下
const EMBEDDINGS_URL = "/embeddings.json";

const CHUNK_COUNT = 6; // 并发分片数
const MIN_CHUNK_BYTES = 2 * 1024 * 1024; // 小于 2MB 的文件不分片

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

// 用 Range 把单个大文件切成 N 段并发下载，返回一个完整的 Response。
// 如果服务端不支持 Range 或文件太小，回退到带流式进度的单次 fetch。
const fetchInChunks = async (url, onProgress) => {
  let total = 0;
  let supportsRange = false;
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) {
      total = Number(head.headers.get("content-length")) || 0;
      supportsRange = (head.headers.get("accept-ranges") || "").toLowerCase() === "bytes";
    }
  } catch (_e) {
    /* HEAD 不行就走单连接路径 */
  }

  // 走单连接 + 流式进度
  if (!supportsRange || total < MIN_CHUNK_BYTES) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
    const len = total || Number(res.headers.get("content-length")) || 0;
    if (!res.body || !len) return res;
    const reader = res.body.getReader();
    const buf = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf.push(value);
      received += value.length;
      onProgress?.({ loaded: received, total: len, progress: (received / len) * 100 });
    }
    return new Response(new Blob(buf), {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") || "application/octet-stream",
        "content-length": String(len),
      },
    });
  }

  // 分片并发
  const chunkSize = Math.ceil(total / CHUNK_COUNT);
  const ranges = [];
  for (let i = 0; i < CHUNK_COUNT; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize - 1, total - 1);
    if (start <= end) ranges.push([start, end]);
  }

  const loaded = new Array(ranges.length).fill(0);
  const reportSum = () => {
    let sum = 0;
    for (let i = 0; i < loaded.length; i++) sum += loaded[i];
    onProgress?.({ loaded: sum, total, progress: (sum / total) * 100 });
  };

  const blobs = await Promise.all(
    ranges.map(async ([start, end], i) => {
      const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
      if (!res.ok || (res.status !== 206 && res.status !== 200)) {
        throw new Error(`chunk ${i} status ${res.status}`);
      }
      if (!res.body) {
        const ab = await res.arrayBuffer();
        loaded[i] = ab.byteLength;
        reportSum();
        return new Blob([ab]);
      }
      const reader = res.body.getReader();
      const buf = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf.push(value);
        loaded[i] += value.length;
        reportSum();
      }
      return new Blob(buf);
    }),
  );

  return new Response(new Blob(blobs), {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(total),
    },
  });
};

// 临时替换 transformers.js 的 env.fetch（它在模块加载时已经 bind 了 globalThis.fetch，
// 所以替换 window.fetch 不会被它感知到，必须改 env.fetch 本身）。
// 命中 predicate 的 URL 走分片，其它走原 env.fetch。fn 结束后恢复。
const withChunkedFetch = async (env, predicate, onProgress, fn) => {
  const orig = env.fetch;
  env.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    const method = (
      init?.method
      || (typeof input !== "string" ? input?.method : null)
      || "GET"
    ).toUpperCase();
    if (method === "GET" && url && predicate(url)) {
      try {
        return await fetchInChunks(url, onProgress);
      } catch (e) {
        console.warn("[vector] 分片下载回退到单连接：", e);
        return orig(input, init);
      }
    }
    return orig(input, init);
  };
  try {
    return await fn();
  } finally {
    env.fetch = orig;
  }
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
    reportProgress("downloading-runtime", 10);

    reportProgress("downloading-model", 10);
    extractor = await withChunkedFetch(
      env,
      (u) => /\.onnx(\?|$)/.test(u),
      ({ progress }) => {
        // 分片下载占整体 10% -> 85%
        const pct = 10 + Math.min(progress, 100) * 0.75;
        reportProgress("downloading-model", Math.min(pct, 85));
      },
      () => pipeline("feature-extraction", MODEL_ID, { dtype: "q8" }),
    );
    reportProgress("downloading-model", 85);

    reportProgress("downloading-index", 85);
    const res = await fetch(EMBEDDINGS_URL);
    if (!res.ok) throw new Error(`无法加载 ${EMBEDDINGS_URL}: ${res.status}`);
    const total = Number(res.headers.get("content-length")) || 0;
    if (total && res.body) {
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        const pct = 85 + Math.min(received / total, 1) * 14;
        reportProgress("downloading-index", pct);
      }
      const blob = new Blob(chunks);
      const payload = JSON.parse(await blob.text());
      postEmbeddings = payload.posts;
    } else {
      const payload = await res.json();
      postEmbeddings = payload.posts;
    }
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
