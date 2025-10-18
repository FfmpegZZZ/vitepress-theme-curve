<!-- 本地搜索 -->
<template>
  <Modal
    :show="store.searchShow"
    title="全局搜索"
    titleIcon="search"
    @mask-click="store.changeShowStatus('searchShow')"
    @modal-close="store.changeShowStatus('searchShow')"
  >
    <div class="local-search">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          placeholder="想要搜点什么"
          autofocus
          @input="handleSearch"
        />
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchQuery" class="search-results">
        <Transition name="fade" mode="out-in">
          <div v-if="searchResults.length > 0" class="search-list">
            <div
              v-for="(item, index) in paginatedResults"
              :key="index"
              class="search-item s-card hover"
              @click="jumpSearch(item.regularPath, item.anchor)"
            >
              <p class="title" v-html="highlightText(item.title, searchQuery)" />
              <div v-if="item.categories || item.tags" class="meta">
                <span v-if="item.categories" class="category">
                  <i class="iconfont icon-folder" />
                  {{ Array.isArray(item.categories) ? item.categories.join(', ') : item.categories }}
                </span>
                <span v-if="item.tags" class="tags">
                  <i class="iconfont icon-hashtag" />
                  {{ Array.isArray(item.tags) ? item.tags.join(', ') : item.tags }}
                </span>
              </div>
              <p v-if="item.description" class="description">
                {{ item.description }}
              </p>
              <p v-if="item.matchedContent" class="content s-card" v-html="item.matchedContent" />
            </div>
          </div>
          <div v-else class="no-result">
            <i class="iconfont icon-search-empty" />
            <span class="text">搜索结果为空</span>
          </div>
        </Transition>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            上一页
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            下一页
          </button>
        </div>

        <!-- 统计信息 -->
        <div class="search-stats">
          <div class="information">
            <span class="text">
              找到 {{ searchResults.length }} 条结果，用时 {{ searchTime }} 毫秒
            </span>
          </div>
          <div class="power">
            <i class="iconfont icon-local" />
            <span class="name">本地搜索</span>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { mainStore } from "@/store";
import { ref, computed, watch } from "vue";

const store = mainStore();
const router = useRouter();
const { theme } = useData();

// 搜索相关状态
const searchQuery = ref("");
const searchResults = ref([]);
const searchTime = ref(0);
const currentPage = ref(1);
const resultsPerPage = 8;

// 分页计算
const totalPages = computed(() => {
  return Math.ceil(searchResults.value.length / resultsPerPage);
});

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * resultsPerPage;
  const end = start + resultsPerPage;
  return searchResults.value.slice(start, end);
});

// 重置分页
watch(searchQuery, () => {
  currentPage.value = 1;
});

/**
 * 处理搜索
 */
const handleSearch = () => {
  const startTime = performance.now();
  const query = searchQuery.value.trim().toLowerCase();

  if (!query) {
    searchResults.value = [];
    return;
  }

  const results = [];
  const postData = theme.value.postData || [];

  // 搜索文章
  postData.forEach((post) => {
    let score = 0;
    const matchedData = {
      ...post,
      matchedContent: null,
      anchor: null,
    };

    // 标题匹配 (权重最高)
    if (post.title && post.title.toLowerCase().includes(query)) {
      score += 10;
    }

    // 分类匹配
    if (post.categories) {
      const categories = Array.isArray(post.categories) 
        ? post.categories.join(',') 
        : post.categories;
      if (categories.toLowerCase().includes(query)) {
        score += 5;
      }
    }

    // 标签匹配
    if (post.tags) {
      const tags = Array.isArray(post.tags) 
        ? post.tags.join(',') 
        : post.tags;
      if (tags.toLowerCase().includes(query)) {
        score += 5;
      }
    }

    // 描述匹配
    if (post.description && post.description.toLowerCase().includes(query)) {
      score += 3;
      const index = post.description.toLowerCase().indexOf(query);
      const start = Math.max(0, index - 50);
      const end = Math.min(post.description.length, index + query.length + 50);
      let snippet = post.description.substring(start, end);
      if (start > 0) snippet = '...' + snippet;
      if (end < post.description.length) snippet = snippet + '...';
      matchedData.matchedContent = highlightText(snippet, query);
    }

    if (score > 0) {
      matchedData.score = score;
      results.push(matchedData);
    }
  });

  // 按得分排序
  results.sort((a, b) => b.score - a.score);
  searchResults.value = results;

  const endTime = performance.now();
  searchTime.value = Math.round(endTime - startTime);
};

/**
 * 高亮匹配的文本
 */
const highlightText = (text, query) => {
  if (!text || !query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

/**
 * 转义正则表达式特殊字符
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 跳转到搜索结果
 */
const jumpSearch = (url, anchor) => {
  store.changeShowStatus("searchShow");
  const fullUrl = anchor ? `${url}#${anchor}` : url;
  router.go(fullUrl);
};

// 组件卸载时清理
onBeforeUnmount(() => {
  searchQuery.value = "";
  searchResults.value = [];
});
</script>

<style lang="scss" scoped>
.local-search {
  height: 100%;
  display: flex;
  flex-direction: column;

  .search-box {
    height: 40px;
    width: 100%;
    margin-bottom: 20px;

    .search-input {
      width: 100%;
      height: 100%;
      outline: none;
      border-radius: 8px;
      font-size: 16px;
      padding: 0.6rem 1rem;
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
  }

  .search-results {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 300px;

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

      .search-item {
        margin-bottom: 12px;
        cursor: pointer;

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

        .description {
          color: var(--main-font-second-color);
          margin-top: 8px;
          font-size: 14px;
          line-height: 1.6;
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

        &:last-child {
          margin-bottom: 0;
        }
      }
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 20px;
      padding: 12px 0;

      .page-btn {
        padding: 6px 16px;
        border-radius: 8px;
        border: 1px solid var(--main-card-border);
        background-color: var(--main-card-second-background);
        color: var(--main-font-color);
        cursor: pointer;
        transition: all 0.3s;

        &:hover:not(:disabled) {
          background-color: var(--main-color);
          color: var(--main-card-border);
          border-color: var(--main-color);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .page-info {
        font-size: 14px;
        color: var(--main-font-second-color);
      }
    }

    .search-stats {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid var(--main-card-border);
      opacity: 0.8;
      font-size: 14px;

      .power {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 16px;
        opacity: 0.6;
        transition:
          color 0.3s,
          opacity 0.3s;

        .iconfont {
          margin-right: 4px;
          font-size: 20px;
          transition: color 0.3s;
        }

        .name {
          font-weight: bold;
        }

        &:hover {
          opacity: 1;
          color: var(--main-color);

          .iconfont {
            color: var(--main-color);
          }
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
</style>
