// 构建期：用本地 bge-small-zh-v1.5 为每篇文章生成 embedding。
// 输出 public/embeddings.json 供运行时余弦相似度比对。
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline, env } from "@huggingface/transformers";
import { getAllPosts } from "../.vitepress/theme/utils/getPostData.mjs";

const MODEL_ID = "Xenova/bge-small-zh-v1.5";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// 让 transformers.js 走本地模型，不联网
env.localModelPath = join(ROOT, "public", "models") + "/";
env.allowLocalModels = true;
env.allowRemoteModels = false;
// 用 fs 后端加载本地 ONNX
env.backends.onnx.wasm.numThreads = 1;

const buildSourceText = (post) => {
  const parts = [];
  if (post.title) parts.push(post.title);
  if (post.description) parts.push(post.description);
  const gi = post.gameInfo;
  if (gi) {
    if (gi.name) parts.push(gi.name);
    if (gi.genre) parts.push(gi.genre);
    if (gi.developer) parts.push(gi.developer);
    if (gi.system) parts.push(gi.system);
  }
  if (Array.isArray(post.tags)) parts.push(post.tags.join(" "));
  if (Array.isArray(post.categories)) parts.push(post.categories.join(" "));
  return parts.join("。");
};

const main = async () => {
  console.log(`📚 加载文章...`);
  // 切到项目根目录，让 getAllPosts 内的 globby("posts/**.md") 能找到
  process.chdir(ROOT);
  const posts = await getAllPosts();
  console.log(`  共 ${posts.length} 篇`);

  console.log(`🧠 加载模型 ${MODEL_ID}...`);
  const extractor = await pipeline("feature-extraction", MODEL_ID, {
    dtype: "q8", // 量化版本
  });

  console.log(`⚡ 生成 embeddings...`);
  const t0 = Date.now();
  const records = [];
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const text = buildSourceText(post);
    if (!text) continue;
    const output = await extractor(text, { pooling: "mean", normalize: true });
    records.push({
      id: post.id,
      url: post.regularPath.replace(/\.html$/, ""),
      title: post.title,
      vector: Array.from(output.data).map((v) => Math.round(v * 10000) / 10000), // 截断到 4 位小数缩小体积
    });
    if ((i + 1) % 5 === 0 || i === posts.length - 1) {
      process.stdout.write(`  [${i + 1}/${posts.length}] ${post.title}\n`);
    }
  }
  const dim = records[0]?.vector.length || 0;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  完成，${elapsed}s，维度 ${dim}`);

  const outputPath = join(ROOT, "public", "embeddings.json");
  await mkdir(dirname(outputPath), { recursive: true });
  const payload = {
    model: MODEL_ID,
    dim,
    generated: new Date().toISOString(),
    posts: records,
  };
  const json = JSON.stringify(payload);
  await writeFile(outputPath, json);
  const sizeKb = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`✅ 写入 public/embeddings.json (${sizeKb} KB, ${records.length} 条)`);
};

main().catch((err) => {
  console.error("❌ 生成失败：", err);
  process.exit(1);
});
