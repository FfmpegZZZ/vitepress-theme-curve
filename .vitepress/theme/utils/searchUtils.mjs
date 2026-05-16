import { pinyin } from "pinyin-pro";
import Fuse from "fuse.js";
import synonymsData from "../data/synonyms.json";

const CJK_RE = /[一-龥]/;

// --- 同义词字典 ---
// 构建反向索引：word -> Set([word, ...synonyms])
const synonymIndex = new Map();
for (const group of synonymsData.groups || []) {
  const set = new Set(group.map((w) => w.toLowerCase()));
  for (const w of set) {
    if (!synonymIndex.has(w)) synonymIndex.set(w, new Set());
    set.forEach((s) => synonymIndex.get(w).add(s));
  }
}

/**
 * 把 query 展开成 [原词, ...同义词]。query 与同义词均不区分大小写。
 * 多词 query 不展开（避免组合爆炸），只对单词扩展。
 */
export const expandQuery = (rawQuery) => {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const set = synonymIndex.get(q);
  if (!set) return [q];
  return Array.from(set);
};

const toFullPinyin = (s) => {
  try {
    return pinyin(s, { toneType: "none", type: "string" }).replace(/\s+/g, "").toLowerCase();
  } catch {
    return "";
  }
};

const toFirstLetters = (s) => {
  try {
    return pinyin(s, { pattern: "first", toneType: "none", type: "string" }).replace(/\s+/g, "").toLowerCase();
  } catch {
    return "";
  }
};

const postSearchCache = new Map();

export const buildSearchBag = (post) => {
  if (postSearchCache.has(post.id)) return postSearchCache.get(post.id);
  const parts = [];
  if (post.title) parts.push(post.title);
  if (post.description) parts.push(post.description);
  if (Array.isArray(post.tags)) parts.push(post.tags.join(" "));
  else if (post.tags) parts.push(String(post.tags));
  if (Array.isArray(post.categories)) parts.push(post.categories.join(" "));
  else if (post.categories) parts.push(String(post.categories));
  const gi = post.gameInfo;
  if (gi) {
    if (gi.name) parts.push(gi.name);
    if (gi.system) parts.push(gi.system);
    if (gi.developer) parts.push(gi.developer);
    if (gi.language) parts.push(gi.language);
    if (gi.genre) parts.push(gi.genre);
  }
  const text = parts.join(" ");
  let pyFull = "";
  let pyInit = "";
  if (CJK_RE.test(text)) {
    pyFull = toFullPinyin(text);
    pyInit = toFirstLetters(text);
  }
  const bag = { text, pyFull, pyInit };
  postSearchCache.set(post.id, bag);
  return bag;
};

// --- Fuse.js 模糊匹配（typo / 漏字母容错） ---
let fuseInstance = null;
let fuseSourcePosts = null;

const ensureFuse = (postData) => {
  if (fuseInstance && fuseSourcePosts === postData) return fuseInstance;
  fuseSourcePosts = postData;
  // 用 buildSearchBag 派生的拼音/全文作为可搜字段
  const docs = postData.map((post) => {
    const bag = buildSearchBag(post);
    return {
      id: post.id,
      title: post.title || "",
      gameInfoName: post.gameInfo?.name || "",
      developer: post.gameInfo?.developer || "",
      genre: post.gameInfo?.genre || "",
      pyFull: bag.pyFull,
      pyInit: bag.pyInit,
    };
  });
  fuseInstance = new Fuse(docs, {
    keys: [
      { name: "title", weight: 0.35 },
      { name: "gameInfoName", weight: 0.3 },
      { name: "developer", weight: 0.15 },
      { name: "genre", weight: 0.05 },
      { name: "pyFull", weight: 0.1 },
      { name: "pyInit", weight: 0.05 },
    ],
    includeScore: true,
    threshold: 0.4, // 越低越严格；0.4 容忍 ~25% 字符差
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  return fuseInstance;
};

/**
 * Fuse 模糊匹配（返回 [{ id, fuseScore }]，分越低越相似）。
 */
export const fuzzyMatch = (postData, rawQuery) => {
  if (!rawQuery || rawQuery.length < 2) return [];
  const fuse = ensureFuse(postData);
  return fuse.search(rawQuery).map((r) => ({ id: r.item.id, fuseScore: r.score }));
};

/**
 * 对一篇文章按 query 打分。
 * @returns {{ score: number, matchedField: string|null, excerpt: string|null }}
 */
export const scorePost = (post, rawQuery) => {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return { score: 0, matchedField: null, excerpt: null };
  const queryIsAscii = /^[\x00-\x7F]+$/.test(q);

  let score = 0;
  let matchedField = null;

  if (post.title?.toLowerCase().includes(q)) {
    score += 20;
    matchedField = "title";
  }

  const gi = post.gameInfo;
  if (gi) {
    if (gi.name?.toLowerCase().includes(q)) score += 18;
    if (gi.developer?.toLowerCase().includes(q)) score += 12;
    if (gi.genre?.toLowerCase().includes(q)) score += 10;
    if (gi.system?.toLowerCase().includes(q)) score += 8;
    if (gi.language?.toLowerCase().includes(q)) score += 6;
  }

  const cats = Array.isArray(post.categories) ? post.categories.join(",") : post.categories || "";
  const tags = Array.isArray(post.tags) ? post.tags.join(",") : post.tags || "";
  if (cats.toLowerCase().includes(q)) score += 5;
  if (tags.toLowerCase().includes(q)) score += 5;

  let excerpt = null;
  if (post.description?.toLowerCase().includes(q)) {
    score += 4;
    const idx = post.description.toLowerCase().indexOf(q);
    const start = Math.max(0, idx - 40);
    const end = Math.min(post.description.length, idx + q.length + 40);
    let s = post.description.substring(start, end);
    if (start > 0) s = "..." + s;
    if (end < post.description.length) s = s + "...";
    excerpt = s;
  }

  if (queryIsAscii) {
    const bag = buildSearchBag(post);
    if (bag.pyFull && bag.pyFull.includes(q)) {
      score += 8;
      if (!matchedField) matchedField = "pinyin";
    } else if (bag.pyInit && bag.pyInit.includes(q)) {
      score += 6;
      if (!matchedField) matchedField = "pinyin-init";
    }
  }

  return { score, matchedField, excerpt };
};

/**
 * 对一组文章做搜索，返回带分值的结果（已按分倒序）。
 * 流程：
 *  1. 同义词扩展 query：原词 + 同义词
 *  2. 对每个展开词做精确/拼音打分（同篇文章取最高分）
 *  3. 没命中再走 Fuse 模糊兜底
 */
export const searchPosts = (postData, rawQuery) => {
  if (!rawQuery || !rawQuery.trim()) return [];

  const queries = expandQuery(rawQuery);
  const matched = new Map(); // id -> { post, score, matchedField, excerpt }

  for (const q of queries) {
    const isOriginal = q === rawQuery.trim().toLowerCase();
    for (const post of postData) {
      const { score, matchedField, excerpt } = scorePost(post, q);
      if (score <= 0) continue;
      // 同义词命中算 80% 权重；原词命中算 100%
      const adjScore = isOriginal ? score : Math.round(score * 0.8);
      const prev = matched.get(post.id);
      if (!prev || prev.score < adjScore) {
        matched.set(post.id, {
          post,
          score: adjScore,
          matchedField: isOriginal ? matchedField : `synonym:${q}`,
          excerpt,
        });
      }
    }
  }

  // Fuse 模糊兜底（只对原词，避免同义词放大噪音）
  const fuseHits = fuzzyMatch(postData, rawQuery);
  for (const { id, fuseScore } of fuseHits) {
    if (matched.has(id)) continue;
    const post = postData.find((p) => p.id === id);
    if (!post) continue;
    const score = Math.max(1, Math.round((1 - fuseScore) * 5));
    matched.set(id, { post, score, matchedField: "fuzzy", excerpt: null });
  }

  const items = Array.from(matched.values());
  items.sort((a, b) => b.score - a.score);
  return items;
};
