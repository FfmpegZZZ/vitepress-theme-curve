<!-- 文章页面 -->
<template>
  <div v-if="postMetaData" class="post">
    <div class="post-meta">
      <div class="meta">
        <div class="categories">
          <a
            v-for="(item, index) in postMetaData.categories"
            :key="index"
            :href="`/pages/categories/${item}`"
            class="cat-item"
          >
            <i class="iconfont icon-folder" />
            <span class="name">{{ item }}</span>
          </a>
        </div>
        <div class="tags">
          <a
            v-for="(item, index) in postMetaData.tags"
            :key="index"
            :href="`/pages/tags/${item}`"
            class="tag-item"
          >
            <i class="iconfont icon-hashtag" />
            <span class="name">{{ item }}</span>
          </a>
        </div>
      </div>
      <h1 class="title">
        {{ postMetaData.title || "未命名文章" }}
      </h1>
      <div class="other-meta">
        <span class="meta date">
          <i class="iconfont icon-date" />
          {{ formatTimestamp(postMetaData.date) }}
        </span>
        <span class="update meta">
          <i class="iconfont icon-time" />
          {{ formatTimestamp(page?.lastUpdated || postMetaData.lastModified) }}
        </span>
        <!-- 热度 -->
        <span class="hot meta">
          <i class="iconfont icon-fire" />
          <span id="twikoo_visitors" class="artalk-pv-count">0</span>
        </span>
        <!-- 评论数 -->
        <span class="chat meta hover" @click="commentRef?.scrollToComments">
          <i class="iconfont icon-chat" />
          <span id="twikoo_comments" class="artalk-comment-count">0</span>
        </span>
      </div>
    </div>
    <div class="post-content">
      <article class="post-article s-card" data-pagefind-body>
        <!-- 游戏信息 -->
        <GameInfo v-if="frontmatter.gameInfo" :gameData="frontmatter.gameInfo" />
        <!-- 过期提醒 -->
        <div class="expired s-card" v-if="postMetaData?.expired >= 180" data-pagefind-ignore>
          本文发表于 <strong>{{ postMetaData?.expired }}</strong> 天前，其中的信息可能已经事过境迁
        </div>
        <!-- AI 摘要 -->
        <ArticleGPT />
        <!-- 文章内容 -->
        <!-- key 强制按路径重建，绕开 SPA 跨页导航时 <Content /> 偶发不渲染的问题 -->
        <Content :key="page.relativePath" id="page-content" class="markdown-main-style" />
        <!-- 参考资料 -->
        <div data-pagefind-ignore>
          <References />
        </div>
        <!-- 版权 -->
        <div data-pagefind-ignore>
          <Copyright v-if="frontmatter.copyright !== false" :postData="postMetaData" />
        </div>
        <!-- 其他信息 -->
        <div class="other-meta" data-pagefind-ignore>
          <div class="all-tags">
            <a
              v-for="(item, index) in postMetaData.tags"
              :key="index"
              :href="`/pages/tags/${item}`"
              class="tag-item"
            >
              <i class="iconfont icon-hashtag" />
              <span class="name">{{ item }}</span>
            </a>
          </div>
          <a
            href="mailto:up@orwells.one"
            class="report"
            target="_blank"
          >
            <i class="iconfont icon-report" />
            反馈与投诉
          </a>
        </div>
        <div data-pagefind-ignore>
          <RewardBtn />
          <!-- 下一篇 -->
          <NextPost />
          <!-- 相关文章 -->
          <RelatedPost />
          <!-- 评论 -->
          <Comments ref="commentRef" />
        </div>
      </article>
      <Aside showToc data-pagefind-ignore />
    </div>
  </div>
</template>

<script setup>
import { formatTimestamp } from "@/utils/helper";
import { generateId } from "@/utils/commonTools";
import initFancybox from "@/utils/initFancybox";

const { page, theme, frontmatter } = useData();

// 评论元素
const commentRef = ref(null);

// 获取对应文章数据。
// 查不到时（hydration 偶发 / postData 未就绪），用 frontmatter 合成一个降级对象，
// 避免 <div v-if="postMetaData"> 把整个文章模板（含 <Content />）从 DOM 中剔除。
const postMetaData = computed(() => {
  const relPath = page.value?.relativePath;
  if (relPath) {
    const postId = generateId(relPath);
    const found = theme.value?.postData?.find((item) => item.id === postId);
    if (found) return found;
  }
  // 降级：从 frontmatter 合成，使页面在任何状态下都能渲染
  const fm = frontmatter.value || {};
  const fallbackPath = relPath ? `/${relPath.replace(/\.md$/, ".html")}` : "";
  return {
    id: relPath ? generateId(relPath) : 0,
    title: fm.title || "未命名文章",
    date: fm.date ? new Date(fm.date).getTime() : (page.value?.lastUpdated || 0),
    lastModified: page.value?.lastUpdated || 0,
    expired: 0,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    categories: Array.isArray(fm.categories) ? fm.categories : [],
    description: fm.description || "",
    regularPath: fallbackPath,
    top: fm.top,
    cover: fm.cover,
    priority: fm.priority || 0,
    gameInfo: fm.gameInfo,
  };
});

// 检测 <Content /> 是否实际渲染出有效内容；若为空则强制全量重载走 SSR。
// 解决 SPA 跨页首次导航时 VitePress 偶发的 Content 渲染为空问题。
const FORCE_RELOAD_KEY = "__post_force_reloaded__";
const ensureContentRendered = () => {
  if (typeof window === "undefined") return;
  const el = document.getElementById("page-content");
  if (!el) return;
  // 把"未找到"和"实际为空"都视作渲染失败
  const text = (el.textContent || "").trim();
  const empty = el.children.length === 0 || text === "404 Page Not Found" || text.length < 10;
  if (!empty) return;
  // sessionStorage sentinel 防死循环：同一路径已强制刷新过一次就不再触发
  let alreadyReloaded = false;
  try {
    alreadyReloaded = sessionStorage.getItem(FORCE_RELOAD_KEY) === location.pathname;
    if (alreadyReloaded) {
      sessionStorage.removeItem(FORCE_RELOAD_KEY);
      console.warn("[Post] 二次仍为空，放弃自动重载");
      return;
    }
    sessionStorage.setItem(FORCE_RELOAD_KEY, location.pathname);
  } catch (_) { /* sessionStorage 不可用时不做 sentinel，单次重试可接受 */ }
  console.warn("[Post] Content 渲染为空，强制重载");
  window.location.reload();
};

onMounted(() => {
  initFancybox(theme.value);
  // 等 loading 遮罩理论上已撤掉（~260-800ms 随机）再检查
  setTimeout(ensureContentRendered, 1000);
});
</script>

<style lang="scss" scoped>
@use "../style/post.scss";

.post {
  width: 100%;
  display: flex;
  flex-direction: column;
  animation: fade-up 0.6s 0.1s backwards;
  .post-meta {
    padding: 2rem 0 3rem 18px;
    width: 100%;
    .meta {
      display: flex;
      flex-direction: row;
      align-items: center;
      .categories {
        margin-right: 12px;
        .cat-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: bold;
          border-radius: 8px;
          background-color: var(--main-mask-Inverse-background);
          opacity: 0.8;
          .iconfont {
            margin-right: 6px;
          }
          &:hover {
            color: var(--main-color);
            background-color: var(--main-color-bg);
            .iconfont {
              color: var(--main-color);
            }
          }
        }
      }
      .tags {
        display: flex;
        flex-direction: row;
        align-items: center;
        .tag-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: bold;
          border-radius: 8px;
          opacity: 0.8;
          .iconfont {
            margin-right: 4px;
            opacity: 0.6;
            font-weight: normal;
          }
          &:hover {
            color: var(--main-color);
            background-color: var(--main-color-bg);
            .iconfont {
              color: var(--main-color);
            }
          }
        }
      }
    }
    .title {
      font-size: 2.2rem;
      line-height: 1.2;
      color: var(--main-font-color);
      margin: 1.4rem 0;
    }
    .other-meta {
      display: flex;
      flex-direction: row;
      align-items: center;
      .meta {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 6px 12px;
        font-size: 14px;
        border-radius: 8px;
        opacity: 0.8;
        .iconfont {
          margin-right: 6px;
          transition: color 0.3s;
        }
        &.date {
          padding-left: 0;
        }
        &.hot {
          .iconfont {
            font-size: 18px;
          }
        }
        &.hover {
          transition:
            color 0.3s,
            background-color 0.3s;
          cursor: pointer;
          &:hover {
            color: var(--main-color);
            background-color: var(--main-color-bg);
            .iconfont {
              color: var(--main-color);
            }
          }
        }
      }
    }
  }
  .post-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    animation: fade-up 0.6s 0.3s backwards;
    .post-article {
      width: calc(100% - 300px);
      padding: 1rem 2.2rem 2.2rem 2.2rem;
      user-select: text;
      cursor: auto;
      &:hover {
        border-color: var(--main-card-border);
      }
      .expired {
        margin: 1.2rem 0 2rem 0;
        padding: 0.8rem 1.2rem;
        border-left: 6px solid var(--main-warning-color);
        border-radius: 6px 16px 16px 6px;
        user-select: none;
        strong {
          color: var(--main-warning-color);
        }
      }
      .other-meta {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        margin: 2rem 0;
        opacity: 0.8;
        .all-tags {
          display: flex;
          flex-direction: row;
          align-items: center;
          .tag-item {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 6px 12px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 8px;
            background-color: var(--main-card-border);
            margin-right: 12px;
            .iconfont {
              margin-right: 4px;
              opacity: 0.6;
              font-weight: normal;
            }
            &:hover {
              color: var(--main-color);
              background-color: var(--main-color-bg);
              .iconfont {
                color: var(--main-color);
              }
            }
          }
        }
        .report {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: bold;
          border-radius: 8px;
          background-color: var(--main-card-border);
          .iconfont {
            margin-right: 6px;
          }
          &:hover {
            color: #efefef;
            background-color: var(--main-error-color);
            .iconfont {
              color: #efefef;
            }
          }
        }
      }
    }
    .main-aside {
      width: 300px;
      padding-left: 1rem;
    }
    @media (max-width: 1200px) {
      .post-article {
        width: 100%;
      }
      .main-aside {
        display: none;
      }
    }
  }
  @media (max-width: 768px) {
    .post-meta {
      padding: 4rem 1.5rem;
      .meta {
        justify-content: center;
        .categories {
          margin-right: 0;
        }
        .tags {
          display: none;
        }
      }
      .title {
        font-size: 1.6rem;
        text-align: center;
        line-height: 40px;
      }
      .other-meta {
        justify-content: center;
      }
    }
    .post-content {
      .post-article {
        border: none;
        padding: 20px 30px;
        .other-meta {
          margin: 1rem 0 2rem 0;
          flex-direction: column;
          .all-tags {
            flex-wrap: wrap;
            .tag-item {
              margin-top: 12px;
            }
          }
          .report {
            margin-top: 20px;
          }
        }
      }
    }
  }
}
</style>
