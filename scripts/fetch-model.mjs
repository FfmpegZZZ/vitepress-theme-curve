// 下载 transformers.js 所需的 bge-small-zh-v1.5 量化 ONNX 模型到 public/models/。
// 仅在模型缺失时下载，避免重复消耗带宽。
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_ID = "Xenova/bge-small-zh-v1.5";
const BASE = "https://huggingface.co";
// transformers.js 在浏览器侧加载需要的文件
const FILES = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "onnx/model_quantized.onnx",
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TARGET_DIR = join(ROOT, "public", "models", MODEL_ID);

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

const human = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const downloadFile = async (relPath) => {
  const url = `${BASE}/${MODEL_ID}/resolve/main/${relPath}`;
  const target = join(TARGET_DIR, relPath);

  if (await exists(target)) {
    console.log(`  ✓ ${relPath} (已存在，跳过)`);
    return;
  }

  await mkdir(dirname(target), { recursive: true });
  process.stdout.write(`  ⏬ ${relPath}... `);

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(target, buf);
  console.log(`done (${human(buf.length)})`);
};

const main = async () => {
  console.log(`📦 准备下载 ${MODEL_ID} 到 public/models/`);
  await mkdir(TARGET_DIR, { recursive: true });
  for (const f of FILES) {
    try {
      await downloadFile(f);
    } catch (err) {
      console.error(`  ✗ ${f} 下载失败：${err.message}`);
      // special_tokens_map.json 可选，缺失不阻断
      if (!f.includes("special_tokens_map")) throw err;
    }
  }
  console.log("✅ 模型下载完成");
};

main().catch((err) => {
  console.error("❌ 下载失败：", err);
  process.exit(1);
});
