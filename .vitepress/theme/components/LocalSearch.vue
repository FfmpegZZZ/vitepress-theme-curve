<!-- 本地搜索 -->
<template>
  <Modal
    :show="store.searchShow"
    title="全局搜索"
    titleIcon="search"
    @mask-click="closeModal"
    @modal-close="closeModal"
  >
    <div class="local-search" @keydown="onKeydown">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          ref="inputRef"
          v-model="searchQuery"
          type="search"
          class="search-input"
          placeholder="想要搜点什么"
          autofocus
        />
        <kbd class="kbd-hint">Ctrl K</kbd>
      </div>

      <!-- 空状态：搜索历史 + 热门标签 -->
      <div v-if="!hasQuery" class="search-empty-state">
        <template v-if="store.searchHistory.length">
          <div class="section-header">
            <span class="title">搜索历史</span>
            <button class="clear-btn" @click="store.clearSearchHistory()">清空</button>
          </div>
          <div class="chip-list">
            <span
              v-for="item in store.searchHistory"
              :key="`h-${item}`"
              class="chip history"
              @click="useHistory(item)"
            >
              <i class="iconfont icon-time" />
              <span class="text">{{ item }}</span>
              <i class="iconfont icon-close remove" @click.stop="store.removeSearchHistoryItem(item)" />
            </span>
          </div>
        </template>
        <template v-if="hotTags.length">
          <div class="section-header">
            <span class="title">热门标签</span>
          </div>
          <div class="chip-list">
            <span
              v-for="tag in hotTags"
              :key="`t-${tag}`"
              class="chip"
              @click="useHistory(tag)"
            >
              <i class="iconfont icon-hashtag" />
              <span class="text">{{ tag }}</span>
            </span>
          </div>
        </template>

      </div>

      <!-- 搜索结果 -->
      <div v-else class="search-results">
        <Transition name="fade" mode="out-in">
          <!-- 向量模型加载中：阻塞结果，显示动画 + 进度 + 提示 -->
          <div v-if="vectorLoading" class="vector-loading">
            <div class="loading-spinner" />
            <div class="loading-label">正在加载 AI 搜索模块</div>
            <div class="loading-progress">
              <div class="loading-bar" :style="{ width: vectorProgress.percent + '%' }" />
            </div>
          </div>
          <div v-else-if="vectorError" class="no-result">
            <i class="iconfont icon-search-empty" />
            <span class="text">AI 加载失败：{{ vectorError }}</span>
          </div>
          <div v-else-if="isSearching" class="searching">
            <i class="iconfont icon-loading rotating" />
            <span class="text">搜索中...</span>
          </div>
          <div v-else-if="groupedResults.length > 0" class="search-list">
            <div
              v-for="group in groupedResults"
              :key="group.type"
              class="group"
            >
              <div class="group-header">
                <i class="iconfont" :class="group.icon" />
                <span class="title">{{ group.label }}</span>
                <span class="count">{{ group.items.length }}</span>
              </div>
              <div
                v-for="(item, index) in group.items"
                :key="`${group.type}-${index}`"
                :class="['search-item', 's-card', 'hover', { active: flatIndex(group.type, index) === selectedIndex }]"
                :data-flat-index="flatIndex(group.type, index)"
                @click="jumpSearch(item.url)"
                @mouseenter="selectedIndex = flatIndex(group.type, index)"
              >
                <p class="title" v-html="item.title" />
                <div v-if="item.meta" class="meta">
                  <span v-if="item.meta.category" class="category">
                    <i class="iconfont icon-folder" />
                    {{ item.meta.category }}
                  </span>
                  <span v-if="item.meta.tags" class="tags">
                    <i class="iconfont icon-hashtag" />
                    {{ item.meta.tags }}
                  </span>
                </div>
                <p v-if="item.excerpt" class="content s-card" v-html="item.excerpt" />
              </div>
            </div>
          </div>
          <div v-else class="no-result">
            <i class="iconfont icon-search-empty" />
            <span class="text">搜索结果为空</span>
          </div>
        </Transition>

        <!-- 统计信息 -->
        <div v-if="!isSearching" class="search-stats">
          <div class="information">
            <span class="text">
              找到 {{ totalResults }} 条结果，用时 {{ searchTime }} 毫秒
            </span>
          </div>
          <div class="power">
            <i class="iconfont icon-local" />
            <span class="name">{{ engineLabel }}</span>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { mainStore } from "@/store";
import { storeToRefs } from "pinia";
import { useDebounceFn } from "@vueuse/core";
import { searchPosts, expandQuery } from "@/utils/searchUtils.mjs";
import { ref, computed, watch, nextTick } from "vue";

const store = mainStore();
const { vectorReady, vectorLoading, vectorProgress, vectorError } = storeToRefs(store);
const router = useRouter();
const { theme } = useData();

const isDev = import.meta.env.DEV;
const engineLabel = isDev ? "本地搜索（开发模式）" : "Pagefind";

let vectorModule = null;

const progressLabel = computed(() => {
  const stages = {
    "downloading-runtime": "正在加载 AI 运行时...",
    "downloading-model": "正在下载语义模型（~23MB）...",
    "downloading-index": "正在加载文章索引...",
    ready: "AI 已就绪",
  };
  return stages[vectorProgress.value.stage] || "正在加载...";
});

const searchQuery = ref("");
const groupedResults = ref([]);
const searchTime = ref(0);
const selectedIndex = ref(0);
const isSearching = ref(false);
const inputRef = ref(null);

let pagefindInstance = null;

const hasQuery = computed(() => searchQuery.value.trim().length > 0);
const totalResults = computed(() => groupedResults.value.reduce((sum, g) => sum + g.items.length, 0));

// 热门标签：取 tagsData 前 8 个
const hotTags = computed(() => {
  const tagsData = theme.value.tagsData || {};
  return Object.keys(tagsData)
    .sort((a, b) => (tagsData[b].count || 0) - (tagsData[a].count || 0))
    .slice(0, 8);
});

// 分组配置
const groupConfig = {
  post: { label: "游戏 / 文章", icon: "icon-folder", order: 1 },
  tag: { label: "标签", icon: "icon-hashtag", order: 2 },
  category: { label: "分类", icon: "icon-folder", order: 3 },
  page: { label: "页面", icon: "icon-link", order: 4 },
  semantic: { label: "🧠 语义相关", icon: "icon-search", order: 5 },
};

const classifyUrl = (url) => {
  if (!url) return "page";
  if (url.includes("/posts/")) return "post";
  if (url.includes("/pages/tags/")) return "tag";
  if (url.includes("/pages/categories/")) return "category";
  return "page";
};

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const highlightText = (text, query) => {
  const t = escapeHtml(text);
  const q = String(query || "").trim();
  if (!t || !q) return t;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return t.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
};

// 扁平索引：将所有 group 拍平用于 ↑↓ 选中
const flatIndex = (groupType, indexInGroup) => {
  let offset = 0;
  for (const g of groupedResults.value) {
    if (g.type === groupType) return offset + indexInGroup;
    offset += g.items.length;
  }
  return offset + indexInGroup;
};

const groupResults = (items) => {
  const buckets = {};
  for (const item of items) {
    const type = classifyUrl(item.url);
    if (!buckets[type]) buckets[type] = [];
    buckets[type].push(item);
  }
  return Object.keys(buckets)
    .map((type) => ({
      type,
      label: groupConfig[type].label,
      icon: groupConfig[type].icon,
      order: groupConfig[type].order,
      items: buckets[type],
    }))
    .sort((a, b) => a.order - b.order);
};

// --- Dev 回退：基于共享的 searchUtils ---
const searchLocalFallback = (query) => {
  const rawQ = query.trim();
  if (!rawQ) return [];
  const postData = theme.value.postData || [];
  return searchPosts(postData, rawQ).map(({ post, matchedField, excerpt }) => ({
    url: post.regularPath?.replace(/\.html$/, "") || "/",
    title: highlightText(post.title || "未命名文章", rawQ),
    excerpt:
      (excerpt && highlightText(excerpt, rawQ)) ||
      (matchedField === "pinyin" || matchedField === "pinyin-init"
        ? `<i>拼音匹配：${rawQ}</i>`
        : null),
    meta: {
      category: Array.isArray(post.categories) ? post.categories.join(", ") : post.categories,
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : post.tags,
    },
  }));
};

// --- 生产：Pagefind ---
const ensurePagefind = async () => {
  if (pagefindInstance) return pagefindInstance;
  try {
    // 用变量绕过 Rollup 静态分析（/pagefind/* 在构建期不存在，由 buildEnd 钩子生成）
    const pagefindUrl = "/pagefind/pagefind.js";
    pagefindInstance = await import(/* @vite-ignore */ pagefindUrl);
    await pagefindInstance.options({
      excerptLength: 30,
    });
    await pagefindInstance.init();
    return pagefindInstance;
  } catch (err) {
    console.error("Pagefind 加载失败：", err);
    pagefindInstance = null;
    return null;
  }
};

const searchPagefind = async (query) => {
  const pf = await ensurePagefind();
  if (!pf) return [];

  // 同义词扩展：原词 + 同义词都跑一遍，结果按 URL 去重并按 Pagefind 自身得分排序
  const queries = expandQuery(query);
  const merged = new Map(); // url -> item
  await Promise.all(
    queries.map(async (q) => {
      const isOriginal = q === query.trim().toLowerCase();
      try {
        const { results } = await pf.search(q);
        // 每个 query 取前 20 条详情，控制请求量
        await Promise.all(
          results.slice(0, 20).map(async (r) => {
            try {
              const data = await r.data();
              const url = data.url.replace(/\.html$/, "");
              if (merged.has(url)) return; // 优先保留首个命中（通常是原词）
              merged.set(url, {
                url,
                title: data.meta?.title
                  ? highlightText(data.meta.title, query)
                  : highlightText(data.url, query),
                excerpt: isOriginal ? data.excerpt : `${data.excerpt}<br><i>同义词命中：${q}</i>`,
                meta: {
                  category: data.meta?.category || data.filters?.category?.[0],
                  tags: data.filters?.tags?.join(", "),
                },
              });
            } catch (_e) {
              /* skip */
            }
          }),
        );
      } catch (e) {
        console.warn(`Pagefind 查询失败 (${q})：`, e);
      }
    }),
  );
  return Array.from(merged.values());
};

// 用 URL 做去重 key（同一篇文章可能既被精确命中又被向量命中）
const dedupeByUrl = (items) => {
  const seen = new Set();
  const result = [];
  for (const it of items) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    result.push(it);
  }
  return result;
};

const runSemanticSearch = async (q) => {
  if (!vectorReady.value) return [];
  try {
    if (!vectorModule) vectorModule = await import("@/utils/searchVector.mjs");
    const hits = await vectorModule.vectorSearch(q, { topK: 8, threshold: 0.55 });
    return hits.map((h) => ({
      url: h.url,
      title: highlightText(h.title || "未命名文章", ""),
      excerpt: `<i>语义相似度：${(h.similarity * 100).toFixed(1)}%</i>`,
      meta: null,
      _semantic: true,
    }));
  } catch (err) {
    console.error("[vector] 搜索失败：", err);
    return [];
  }
};

// 执行搜索（防抖 150ms）
const runSearch = useDebounceFn(async () => {
  const q = searchQuery.value.trim();
  if (!q) {
    groupedResults.value = [];
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
  const t0 = performance.now();

  // 普通搜索 + 向量搜索并行
  const [primaryItems, semanticItems] = await Promise.all([
    isDev ? Promise.resolve(searchLocalFallback(q)) : searchPagefind(q),
    vectorReady.value ? runSemanticSearch(q) : Promise.resolve([]),
  ]);

  // 普通结果先分组
  const primaryGroups = groupResults(dedupeByUrl(primaryItems));
  // 向量结果剔除已出现的 URL
  const primaryUrls = new Set(primaryItems.map((i) => i.url));
  const semanticOnly = semanticItems.filter((i) => !primaryUrls.has(i.url));
  // 向量结果手动加成 semantic 分组（不走 classifyUrl）
  const finalGroups = [...primaryGroups];
  if (semanticOnly.length > 0) {
    finalGroups.push({
      type: "semantic",
      label: groupConfig.semantic.label,
      icon: groupConfig.semantic.icon,
      order: groupConfig.semantic.order,
      items: semanticOnly,
    });
  }
  groupedResults.value = finalGroups;
  searchTime.value = Math.round(performance.now() - t0);
  selectedIndex.value = 0;
  isSearching.value = false;
}, 150);

watch(searchQuery, () => {
  if (!searchQuery.value.trim()) {
    groupedResults.value = [];
    isSearching.value = false;
    return;
  }
  runSearch();
});

const useHistory = (q) => {
  searchQuery.value = q;
  nextTick(() => inputRef.value?.focus());
};

const closeModal = () => {
  store.changeShowStatus("searchShow");
};

const jumpSearch = (url) => {
  const q = searchQuery.value.trim();
  if (q) store.addSearchHistory(q);
  store.changeShowStatus("searchShow");
  // 兼容 cleanUrls：去掉 .html 后缀
  router.go(url.replace(/\.html$/, ""));
};

// 键盘导航
const flatItems = computed(() => groupedResults.value.flatMap((g) => g.items));

const onKeydown = (e) => {
  if (!hasQuery.value || flatItems.value.length === 0) {
    if (e.key === "Escape") closeModal();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % flatItems.value.length;
    scrollSelectedIntoView();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value - 1 + flatItems.value.length) % flatItems.value.length;
    scrollSelectedIntoView();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const item = flatItems.value[selectedIndex.value];
    if (item) jumpSearch(item.url);
  } else if (e.key === "Escape") {
    closeModal();
  }
};

const scrollSelectedIntoView = () => {
  nextTick(() => {
    const el = document.querySelector(`[data-flat-index="${selectedIndex.value}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
};

// 模态框打开时：预加载 Pagefind + 触发向量模型加载
watch(
  () => store.searchShow,
  (open) => {
    if (open) {
      if (!isDev) ensurePagefind();
      // 向量模型懒加载（store 内部已经做了并发去重）
      store.ensureVectorLoaded();
    } else {
      searchQuery.value = "";
      groupedResults.value = [];
      selectedIndex.value = 0;
    }
  },
);

// 向量加载完成后，若已有 query，重跑一次让结果包含语义分组
watch(vectorReady, (ready) => {
  if (ready && searchQuery.value.trim()) runSearch();
});

onBeforeUnmount(() => {
  searchQuery.value = "";
  groupedResults.value = [];
});
</script>

<style lang="scss" scoped>
.local-search {
  height: 100%;
  display: flex;
  flex-direction: column;

  .search-box {
    position: relative;
    height: 40px;
    width: 100%;
    margin-bottom: 20px;

    .search-input {
      width: 100%;
      height: 100%;
      outline: none;
      border-radius: 8px;
      font-size: 16px;
      padding: 0.6rem 3rem 0.6rem 1rem;
      color: var(--main-font-color);
      font-family: var(--main-font-family);
      border: 1px solid var(--main-card-border);
      background-color: var(--main-card-second-background);
      transition:
        border-color 0.3s,
        box-shadow 0.3s;

      &:focus {
        border-color: var(--main-color);
        box-shadow: 0 8px 16px -4px var(--main-color-bg);
      }

      &::-webkit-search-cancel-button {
        display: none;
      }
    }

    .kbd-hint {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--main-card-border);
      background-color: var(--main-card-background);
      color: var(--main-font-second-color);
      pointer-events: none;
    }
  }

  .search-empty-state {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 200px;

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;

      .title {
        font-size: 14px;
        font-weight: bold;
        color: var(--main-font-second-color);
      }

      .clear-btn {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 6px;
        border: none;
        background: transparent;
        color: var(--main-font-second-color);
        cursor: pointer;

        &:hover {
          color: var(--main-color);
        }
      }
    }

    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        font-size: 13px;
        border-radius: 999px;
        border: 1px solid var(--main-card-border);
        background-color: var(--main-card-second-background);
        cursor: pointer;
        transition: all 0.2s;

        .iconfont {
          font-size: 12px;
          opacity: 0.7;
        }

        .text {
          line-height: 1;
        }

        .remove {
          margin-left: 4px;
          opacity: 0.4;

          &:hover {
            opacity: 1;
            color: var(--main-error-color);
          }
        }

        &:hover {
          border-color: var(--main-color);
          color: var(--main-color);

          .iconfont {
            opacity: 1;
          }
        }
      }
    }
  }

  .search-results {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 300px;

    .searching {
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      opacity: 0.6;

      .rotating {
        animation: spin 1s linear infinite;
      }
    }

    .vector-loading {
      height: 280px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 0 24px;

      .loading-spinner {
        width: 44px;
        height: 44px;
        border: 3px solid var(--main-card-border);
        border-top-color: var(--main-color);
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
      }

      .loading-label {
        font-size: 15px;
        color: var(--main-font-color);
        font-weight: 500;
      }

      .loading-progress {
        width: 240px;
        max-width: 100%;
        height: 4px;
        border-radius: 2px;
        background-color: var(--main-card-border);
        overflow: hidden;

        .loading-bar {
          height: 100%;
          background-color: var(--main-color);
          transition: width 0.3s;
        }
      }

      .loading-hint {
        font-size: 12px;
        color: var(--main-font-second-color);
        text-align: center;
      }
    }

    .no-result {
      height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .iconfont {
        font-size: 40px;
        margin-bottom: 12px;
      }

      .text {
        font-size: 18px;
        opacity: 0.6;
      }
    }

    .search-list {
      flex: 1;

      .group {
        margin-bottom: 14px;

        .group-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          padding: 0 4px;
          font-size: 13px;
          color: var(--main-font-second-color);

          .title {
            font-weight: bold;
          }

          .count {
            margin-left: auto;
            font-size: 12px;
            opacity: 0.6;
          }
        }

        .search-item {
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;

          &.active {
            border-color: var(--main-color);
            box-shadow: 0 4px 12px -2px var(--main-color-bg);
          }

          .title {
            display: inline;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 6px;

            :deep(mark) {
              background-color: transparent;
              color: var(--main-color);
              font-weight: bold;
            }
          }

          .meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 8px;
            font-size: 13px;
            color: var(--main-font-second-color);

            .category,
            .tags {
              display: flex;
              align-items: center;
              gap: 4px;

              .iconfont {
                font-size: 14px;
              }
            }
          }

          .content {
            color: var(--main-font-second-color);
            margin-top: 0.8rem;
            font-size: 12px;
            padding: 8px;
            border-radius: 8px;
            line-height: 1.6;

            :deep(mark) {
              background-color: transparent;
              color: var(--main-color);
              font-weight: bold;
            }
          }

          p {
            margin: 0;
          }
        }
      }
    }

    .search-stats {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--main-card-border);
      opacity: 0.8;
      font-size: 14px;

      .power {
        display: flex;
        align-items: center;
        font-size: 16px;
        opacity: 0.6;

        .iconfont {
          margin-right: 4px;
          font-size: 20px;
        }

        .name {
          font-weight: bold;
        }
      }

      @media (max-width: 512px) {
        justify-content: center;

        .information {
          display: none;
        }
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
