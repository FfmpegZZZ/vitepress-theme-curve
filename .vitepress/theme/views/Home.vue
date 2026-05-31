<!-- 首页 -->
<template>
  <div class="home">
    <Banner v-if="showHeader" :height="store.bannerType" />
    <div class="home-content">
      <div class="posts-content">
        <!-- 分类总览 -->
        <TypeBar :type="showTags ? 'tags' : 'categories'" />
        <!-- 文章列表 -->
        <PostList :listData="postData" />
        <!-- 无限滚动：哨兵 + 加载/到底提示 -->
        <template v-if="infiniteEnabled">
          <div v-if="hasMore" ref="sentinelEl" class="infinite-sentinel" role="status" aria-live="polite">
            <div class="infinite-spinner" aria-hidden="true">
              <span class="dot" />
              <span class="dot" />
              <span class="dot" />
            </div>
            <span class="infinite-loading-text">{{ loadingMore ? "正在加载更多……" : "滚动加载下一页" }}</span>
          </div>
          <div v-else-if="postData.length > 0" class="infinite-end">—— 已经到底了 ——</div>
          <noscript>
            <div class="infinite-noscript">
              <a :href="nextPageHref">下一页</a>
            </div>
          </noscript>
        </template>
        <!-- 分页（仅在无限滚动关闭时显示） -->
        <Pagination
          v-else
          :total="allListTotal"
          :page="currentPageNum"
          :limit="postSize"
          :useParams="showCategories || showTags ? true : false"
          :routePath="
            showCategories
              ? `/pages/categories/${showCategories}`
              : showTags
                ? `/pages/tags/${showTags}`
                : ''
          "
        />

      </div>
      <!-- 侧边栏 -->
      <Aside />
    </div>
  </div>
</template>

<script setup>
import { mainStore } from "@/store";

const { theme } = useData();
const route = useRoute();
const router = useRouter();
const store = mainStore();
const props = defineProps({
  // 显示首页头部
  showHeader: {
    type: Boolean,
    default: false,
  },
  // 当前页数
  page: {
    type: Number,
    default: 1,
  },
  // 显示分类
  showCategories: {
    type: [null, String],
    default: null,
  },
  // 显示标签
  showTags: {
    type: [null, String],
    default: null,
  },
});

// 每页文章数
const postSize = theme.value.postSize;
// 是否启用无限滚动（主题配置，未配置则默认开启）
const infiniteEnabled = computed(() => theme.value.infiniteScroll !== false);

// 当前列表上下文 key（区分首页 / 标签 / 分类），用于跨导航恢复 endPageIndex
const listContext = computed(() => {
  if (props.showCategories) return `cat:${props.showCategories}`;
  if (props.showTags) return `tag:${props.showTags}`;
  return "home";
});

// 源数据（首页 / 标签 / 分类）
const sourceData = computed(() => {
  if (props.showCategories) {
    return theme.value.categoriesData[props.showCategories]?.articles ?? [];
  }
  if (props.showTags) {
    return theme.value.tagsData[props.showTags]?.articles ?? [];
  }
  return theme.value.postData ?? [];
});

// 列表总数量
const allListTotal = computed(() => sourceData.value.length);

// 从 URL 获取页码参数
const urlPageNum = ref(1);

// 更新页码
const updateUrlPageNum = () => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  urlPageNum.value = page ? Number(page) : 1;
};

// 同步读取一次 URL，使 endPageIndex 初值正确（避免被 mounted 后的异步刷新覆盖）
updateUrlPageNum();

// 当前页码（用于分页组件显示）
const currentPageNum = computed(() => {
  if (props.showCategories || props.showTags) {
    return urlPageNum.value;
  }
  return props.page || 1;
});

// 0-indexed 当前页索引
const currentPageIndex = computed(() => {
  if (props.showCategories || props.showTags) {
    return urlPageNum.value > 0 ? urlPageNum.value - 1 : 0;
  }
  return props.page ? props.page - 1 : 0;
});

// 无限滚动状态：当前已渲染到的"末尾页索引"（0-indexed）
const endPageIndex = ref(currentPageIndex.value);

// 路由/页码变化时，把 endPageIndex 重置回新起点（popstate 触发的 URL 切换走这里）
watch(currentPageIndex, (val) => {
  endPageIndex.value = val;
});

// 列表数据
const postData = computed(() => {
  const data = sourceData.value;
  if (!data.length) return [];
  if (!infiniteEnabled.value) {
    const p = currentPageIndex.value;
    return data.slice(p * postSize, p * postSize + postSize);
  }
  const start = currentPageIndex.value * postSize;
  const end = (endPageIndex.value + 1) * postSize;
  return data.slice(start, end);
});

// 是否还有下一页
const hasMore = computed(() => {
  if (!infiniteEnabled.value) return false;
  return (endPageIndex.value + 1) * postSize < sourceData.value.length;
});

// noscript fallback：指向静态的 /page/N（标签/分类页改走 ?page=N）
const nextPageHref = computed(() => {
  const next = currentPageNum.value + 1;
  if (props.showCategories) return `/pages/categories/${props.showCategories}?page=${next}`;
  if (props.showTags) return `/pages/tags/${props.showTags}?page=${next}`;
  return `/page/${next}`;
});

// endPageIndex 变化时写入 store，供同 SPA 会话内跨导航恢复
watch(endPageIndex, (val) => {
  store.lastEndPageIndex = val;
  store.lastListContext = listContext.value;
});

// 监听路由变化更新页码
watch(
  () => route.path,
  () => {
    nextTick(() => updateUrlPageNum());
  },
);

// —— 无限滚动哨兵 + IntersectionObserver ——
const sentinelEl = ref(null);
const loadingMore = ref(false);
let io = null;

const disconnectIO = () => {
  if (io) {
    io.disconnect();
    io = null;
  }
};

const setupIO = () => {
  if (typeof window === "undefined") return;
  if (!infiniteEnabled.value || !hasMore.value) {
    disconnectIO();
    return;
  }
  if (!sentinelEl.value || io) return;
  io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      if (loadingMore.value || !hasMore.value) return;
      loadingMore.value = true;
      // 让 loading 文案有一帧渲染机会，再扩窗
      requestAnimationFrame(() => {
        endPageIndex.value += 1;
        loadingMore.value = false;
      });
    },
    { rootMargin: "400px 0px" },
  );
  io.observe(sentinelEl.value);
};

// hasMore false→true 时重连 IO，true→false 时断开
watch(hasMore, async (val) => {
  if (!val) {
    disconnectIO();
    return;
  }
  await nextTick();
  setupIO();
});

// 上下文变化时（标签/分类切换）重连 IO
watch(listContext, async () => {
  disconnectIO();
  await nextTick();
  setupIO();
});

// —— 生命周期 ——
let idleHandle = null;
let idleFallbackTimer = null;

onMounted(() => {
  updateUrlPageNum();
  window.addEventListener("popstate", updateUrlPageNum);

  // 同会话返回：还原上次累积到的 endPageIndex
  if (
    infiniteEnabled.value
    && store.lastListContext === listContext.value
    && store.lastEndPageIndex > endPageIndex.value
  ) {
    endPageIndex.value = store.lastEndPageIndex;
  }
  // 消费完清空
  store.lastEndPageIndex = -1;
  store.lastListContext = "";

  // 挂载 IO 哨兵
  nextTick(() => setupIO());

  // 主页空闲时预拉向量模型（Save-Data 由 store 内部禁用；这里只跳过 2G 慢网）
  const conn = typeof navigator !== "undefined" ? navigator.connection : null;
  if (conn && /^(2g|slow-2g)$/i.test(conn.effectiveType || "")) return;

  const kick = () => store.ensureVectorLoaded();
  if (typeof window.requestIdleCallback === "function") {
    idleHandle = window.requestIdleCallback(kick, { timeout: 8000 });
  } else {
    idleFallbackTimer = window.setTimeout(kick, 2500);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("popstate", updateUrlPageNum);
  disconnectIO();
  // 离开时把累积位置写入 store，供返回时恢复
  if (infiniteEnabled.value && endPageIndex.value > currentPageIndex.value) {
    store.lastEndPageIndex = endPageIndex.value;
    store.lastListContext = listContext.value;
  }
  if (idleHandle != null && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(idleHandle);
  }
  if (idleFallbackTimer != null) window.clearTimeout(idleFallbackTimer);
});

// 恢复滚动位置
const restoreScrollY = (val) => {
  if (typeof window === "undefined" || val) return false;
  const scrollY = store.lastScrollY;
  nextTick().then(() => {
    window.scrollTo({ top: scrollY, behavior: "smooth" });
    store.lastScrollY = 0;
  });
};

// 监听加载结束
watch(
  () => store.loadingStatus,
  (val) => restoreScrollY(val),
);
</script>

<style lang="scss" scoped>
.home {
  .home-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    .posts-content {
      width: calc(100% - 300px);
      transition: width 0.3s;
    }
    .main-aside {
      width: 300px;
      padding-left: 1rem;
    }
    @media (max-width: 1200px) {
      .posts-content {
        width: 100%;
      }
      .main-aside {
        display: none;
      }
    }
  }
  .infinite-sentinel {
    width: 100%;
    margin-top: 16px;
    padding: 16px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--main-font-second-color);
    font-size: 13px;
    opacity: 0.85;
    animation: fade-up 0.4s backwards;
    .infinite-spinner {
      display: flex;
      align-items: center;
      gap: 6px;
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--main-color);
        opacity: 0.4;
        animation: infinite-bounce 1s ease-in-out infinite both;
      }
      .dot:nth-child(1) { animation-delay: -0.32s; }
      .dot:nth-child(2) { animation-delay: -0.16s; }
      .dot:nth-child(3) { animation-delay: 0s; }
    }
    .infinite-loading-text {
      letter-spacing: 0.05em;
    }
  }
  @keyframes infinite-bounce {
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.35;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
  .infinite-end {
    width: 100%;
    margin-top: 24px;
    padding: 12px 0;
    text-align: center;
    color: var(--main-font-second-color);
    font-size: 13px;
    opacity: 0.5;
    letter-spacing: 0.1em;
  }
  .infinite-noscript {
    width: 100%;
    margin-top: 16px;
    text-align: center;
    a {
      color: var(--main-color);
      text-decoration: underline;
    }
  }
}
</style>
