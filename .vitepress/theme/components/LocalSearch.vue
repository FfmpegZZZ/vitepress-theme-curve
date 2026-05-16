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
          <div v-if="isSearching" class="searching">
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
import { useDebounceFn } from "@vueuse/core";
import { ref, computed, watch, nextTick } from "vue";

const store = mainStore();
const router = useRouter();
const { theme } = useData();

const isDev = import.meta.env.DEV;
const engineLabel = isDev ? "本地搜索（开发模式）" : "Pagefind";

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

// --- Dev 回退：子串匹配 postData 元数据 ---
const searchLocalFallback = (query) => {
  const q = query.toLowerCase();
  const items = [];
  const postData = theme.value.postData || [];

  for (const post of postData) {
    let score = 0;
    let excerpt = null;
    if (post.title?.toLowerCase().includes(q)) score += 10;
    const cats = Array.isArray(post.categories) ? post.categories.join(",") : post.categories || "";
    const tags = Array.isArray(post.tags) ? post.tags.join(",") : post.tags || "";
    if (cats.toLowerCase().includes(q)) score += 5;
    if (tags.toLowerCase().includes(q)) score += 5;
    if (post.description?.toLowerCase().includes(q)) {
      score += 3;
      const idx = post.description.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 40);
      const end = Math.min(post.description.length, idx + q.length + 40);
      let s = post.description.substring(start, end);
      if (start > 0) s = "..." + s;
      if (end < post.description.length) s = s + "...";
      excerpt = highlightText(s, query);
    }
    if (score > 0) {
      items.push({
        url: post.regularPath?.replace(/\.html$/, "") || "/",
        title: highlightText(post.title || "未命名文章", query),
        excerpt,
        meta: {
          category: Array.isArray(post.categories) ? post.categories.join(", ") : post.categories,
          tags: Array.isArray(post.tags) ? post.tags.join(", ") : post.tags,
        },
        score,
      });
    }
  }

  items.sort((a, b) => b.score - a.score);
  return items;
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
  const { results } = await pf.search(query);
  const items = [];
  // 取前 30 条详情，避免请求过多
  const limited = results.slice(0, 30);
  await Promise.all(
    limited.map(async (r) => {
      try {
        const data = await r.data();
        items.push({
          url: data.url.replace(/\.html$/, ""),
          title: data.meta?.title ? highlightText(data.meta.title, query) : highlightText(data.url, query),
          excerpt: data.excerpt,
          meta: {
            category: data.meta?.category || data.filters?.category?.[0],
            tags: data.filters?.tags?.join(", "),
          },
        });
      } catch (e) {
        console.warn("Pagefind 结果解析失败", e);
      }
    }),
  );
  return items;
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
  const items = isDev ? searchLocalFallback(q) : await searchPagefind(q);
  groupedResults.value = groupResults(items);
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

// 模态框打开时预加载 Pagefind
watch(
  () => store.searchShow,
  (open) => {
    if (open && !isDev) ensurePagefind();
    if (!open) {
      searchQuery.value = "";
      groupedResults.value = [];
      selectedIndex.value = 0;
    }
  },
);

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
