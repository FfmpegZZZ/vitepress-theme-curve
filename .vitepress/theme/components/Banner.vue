<template>
  <div v-if="type === 'text'" :class="['banner', bannerType]" id="main-banner">
    <h1 class="title">你好，欢迎来到{{ theme.siteMeta.title }}</h1>
    <div class="search-container">
      <div class="search-wrapper">
        <i class="iconfont icon-search search-icon" />
        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          placeholder="搜索游戏..."
          @keyup.enter="handleSearch"
          @focus="showSearchResults = true"
        />
        <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
          <i class="iconfont icon-close" />
        </button>
      </div>
      <!-- 搜索结果下拉框 -->
      <Transition name="fade">
        <div v-if="showSearchResults && searchQuery.trim()" class="search-results-dropdown">
          <!-- 有搜索结果 -->
          <template v-if="searchResults.length > 0">
            <div
              v-for="(item, index) in searchResults.slice(0, 5)"
              :key="index"
              class="result-item"
              @click="jumpToPost(item.regularPath)"
            >
              <div class="result-title" v-html="highlightMatch(item.title, searchQuery)" />
              <div v-if="item.description" class="result-desc">{{ truncateText(item.description, 80) }}</div>
              <div class="result-meta">
                <span v-if="item.categories" class="meta-item">
                  <i class="iconfont icon-folder" />
                  {{ Array.isArray(item.categories) ? item.categories[0] : item.categories }}
                </span>
                <span v-if="item.tags" class="meta-item">
                  <i class="iconfont icon-hashtag" />
                  {{ Array.isArray(item.tags) ? item.tags.slice(0, 2).join(', ') : item.tags }}
                </span>
              </div>
            </div>
            <div v-if="searchResults.length > 5" class="view-all" @click="openFullSearch">
              查看全部 {{ searchResults.length }} 条结果
            </div>
          </template>
          <!-- 无搜索结果 -->
          <div v-else class="no-results">
            <i class="iconfont icon-search-empty" />
            <span>未找到相关结果</span>
          </div>
        </div>
      </Transition>
    </div>
    <!-- 一言暂时隐藏 -->
    <!-- <div class="subtitle">
      <Transition name="fade" mode="out-in">
        <span :key="hitokotoData?.hitokoto" class="text">
          {{ hitokotoData?.hitokoto ? hitokotoData?.hitokoto : theme.siteMeta.description }}
        </span>
      </Transition>
    </div> -->
    <Transition name="fade" mode="out-in">
      <i v-if="height === 'full'" class="iconfont icon-up" @click="scrollToHome" />
    </Transition>
  </div>
  <div
    v-else-if="type === 'page'"
    :class="['banner-page', 's-card', { image }]"
    :style="{
      backgroundImage: image ? `url(${image})` : null,
    }"
  >
    <div class="top">
      <div class="title">
        <span class="title-small">{{ title }}</span>
        <span class="title-big">{{ desc }}</span>
      </div>
      <div class="top-right">
        <slot name="header-slot" />
      </div>
    </div>
    <slot />
    <div class="footer">
      <div class="footer-left">
        {{ footer }}
      </div>
      <div class="footer-right">
        <slot name="footer-slot" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { mainStore } from "@/store";
import { getHitokoto } from "@/api";

const store = mainStore();
const router = useRouter();
const { theme } = useData();
const props = defineProps({
  // 类型
  type: {
    type: String,
    default: "text",
  },
  // 高度
  height: {
    type: String,
    default: "half",
  },
  // 标题
  title: {
    type: String,
    default: "这里是标题",
  },
  // 简介
  desc: {
    type: String,
    default: "这里是简介",
  },
  // 注释
  footer: {
    type: String,
    default: "",
  },
  // 背景 
  image: {
    type: String,
    default: "",
  },
});

const hitokotoData = ref(null);
const hitokotoTimeOut = ref(null);

// banner
const bannerType = ref(null);

// 搜索相关
const searchQuery = ref("");
const searchResults = ref([]);
const showSearchResults = ref(false);

// 获取一言数据
const getHitokotoData = async () => {
  try {
    const result = await getHitokoto();
    const { hitokoto, from, from_who } = result;
    hitokotoData.value = { hitokoto, from, from_who };
  } catch (error) {
    $message.error("一言获取失败");
    console.error("一言获取失败：", error);
  }
};

// 搜索功能
const performSearch = () => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    searchResults.value = [];
    return;
  }

  const postData = theme.value.postData || [];
  const results = [];

  postData.forEach((post) => {
    let score = 0;

    // 标题匹配
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
    }

    if (score > 0) {
      results.push({ ...post, score });
    }
  });

  // 按得分排序
  results.sort((a, b) => b.score - a.score);
  searchResults.value = results;
};

// 处理搜索
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    openFullSearch();
  }
};

// 清除搜索
const clearSearch = () => {
  searchQuery.value = "";
  searchResults.value = [];
  showSearchResults.value = false;
};

// 跳转到文章
const jumpToPost = (url) => {
  showSearchResults.value = false;
  router.go(url);
};

// 高亮匹配的文本
const highlightMatch = (text, query) => {
  if (!text || !query) return text;
  const regex = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
};

// 转义正则表达式特殊字符
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// 截断文本
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// 打开完整搜索
const openFullSearch = () => {
  showSearchResults.value = false;
  store.changeShowStatus('searchShow');
  // 延迟一点以确保搜索框打开
  setTimeout(() => {
    // 可以在这里设置搜索词到全局搜索框
  }, 100);
};

// 监听搜索输入
watch(searchQuery, () => {
  performSearch();
});

// 点击外部关闭搜索结果
const handleClickOutside = (event) => {
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer && !searchContainer.contains(event.target)) {
    showSearchResults.value = false;
  }
};

// 滚动至首页
const scrollToHome = () => {
  const bannerDom = document.getElementById("main-banner");
  if (!bannerDom) return false;
  scrollTo({
    top: bannerDom.offsetHeight,
    behavior: "smooth",
  });
};

watch(
  () => store.bannerType,
  (val) => {
    bannerType.value = val;
  },
);

onMounted(() => {
  // 暂时不加载一言
  // if (props.type === "text") {
  //   hitokotoTimeOut.value = setTimeout(() => {
  //     getHitokotoData();
  //   }, 2000);
  // }
  // 更改 banner 类型
  bannerType.value = store.bannerType;
  
  // 添加点击外部事件监听
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  clearTimeout(hitokotoTimeOut.value);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style lang="scss" scoped>
.banner {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: fade-up 0.6s 0.1s backwards;
  transition: height 0.3s;
  &.full {
    opacity: 0;
    height: calc(100vh - 70px);
    padding-bottom: 100px;
    animation: fade-up 0.6s 0.5s forwards;
    .subtitle {
      opacity: 0;
      animation: fade-up-opacity 0.8s 0.5s forwards;
    }
  }
  .title {
    font-family: "Site Title";
    font-weight: bold;
    font-size: 2.75rem;
  }
  .search-container {
    position: relative;
    width: 80%;
    max-width: 600px;
    margin-top: 2rem;
    animation: fade-up-opacity 0.6s 0.2s backwards;
    
    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      background-color: var(--main-card-background);
      border: 2px solid var(--main-card-border);
      border-radius: 50px;
      padding: 0.8rem 1.5rem;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      
      &:focus-within {
        border-color: var(--main-color);
        box-shadow: 0 8px 20px var(--main-color-bg);
      }
      
      .search-icon {
        font-size: 20px;
        color: var(--main-font-second-color);
        margin-right: 12px;
        transition: color 0.3s;
      }
      
      .search-input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        font-size: 16px;
        color: var(--main-font-color);
        font-family: var(--main-font-family);
        
        &::placeholder {
          color: var(--main-font-second-color);
          opacity: 0.6;
        }
        
        &::-webkit-search-cancel-button {
          display: none;
        }
      }
      
      .clear-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--main-font-second-color);
        transition: all 0.3s;
        border-radius: 50%;
        
        &:hover {
          background-color: var(--main-card-border);
          color: var(--main-font-color);
        }
        
        .iconfont {
          font-size: 14px;
        }
      }
      
      &:focus-within .search-icon {
        color: var(--main-color);
      }
    }
    
    .search-results-dropdown {
      position: absolute;
      top: calc(100% + 12px);
      left: 0;
      right: 0;
      background-color: var(--main-card-background);
      border: 1px solid var(--main-card-border);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      z-index: 1000;
      max-height: 400px;
      overflow-y: auto;
      
      .result-item {
        padding: 1rem 1.5rem;
        cursor: pointer;
        transition: background-color 0.3s;
        border-bottom: 1px solid var(--main-card-border);
        
        &:last-child {
          border-bottom: none;
        }
        
        &:hover {
          background-color: var(--main-card-second-background);
        }
        
        .result-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--main-font-color);
          margin-bottom: 6px;
          line-height: 1.4;
          
          :deep(.highlight) {
            color: var(--main-color);
            font-weight: 700;
            background-color: transparent;
          }
        }
        
        .result-desc {
          font-size: 13px;
          color: var(--main-font-second-color);
          margin-bottom: 8px;
          line-height: 1.5;
        }
        
        .result-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          
          .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--main-font-second-color);
            opacity: 0.8;
            
            .iconfont {
              font-size: 12px;
            }
          }
        }
      }
      
      .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1.5rem;
        color: var(--main-font-second-color);
        
        .iconfont {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }
        
        span {
          font-size: 14px;
          opacity: 0.8;
        }
      }
      
      .view-all {
        padding: 1rem 1.5rem;
        text-align: center;
        color: var(--main-color);
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.3s;
        border-top: 1px solid var(--main-card-border);
        
        &:hover {
          background-color: var(--main-color-bg);
        }
      }
    }
  }
  .subtitle {
    width: 80%;
    font-size: 1.25rem;
    opacity: 0.8;
    animation: fade-up-opacity 0.6s 0.1s backwards;
    .text {
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
  .icon-up {
    font-size: 20px;
    position: absolute;
    bottom: 60px;
    left: calc(50% - 10px);
    transform: rotate(180deg);
    animation: moveDown 2s ease-in-out infinite;
    cursor: pointer;
  }
  @media (max-width: 768px) {
    align-items: flex-start;
    height: 240px;
    .title {
      font-size: 2.25rem;
    }
    .search-container {
      width: 90%;
      margin-top: 1.5rem;
      
      .search-wrapper {
        padding: 0.6rem 1rem;
        
        .search-input {
          font-size: 14px;
        }
      }
    }
    .subtitle {
      height: 50px;
      font-size: 1.125rem;
      margin-left: 8px;
      .text {
        text-align: left;
      }
    }
  }
}
.banner-page {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  min-height: 380px;
  background-size: cover;
  .top {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    .title {
      display: flex;
      flex-direction: column;
      .title-small {
        color: var(--main-font-second-color);
        font-size: 0.875rem;
      }
      .title-big {
        font-size: 2.25rem;
        font-weight: bold;
        line-height: 1.2;
        margin-top: 12px;
        color: #000000;
      }
    }
  }
  .footer {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    .footer-left {
      margin-top: auto;
      color: var(--main-font-second-color);
      opacity: 0.8;
    }
  }
  &.image {
    color: #fff !important;
    .top {
      .title-small {
        color: #fff;
        opacity: 0.6;
      }
    }
    .footer {
      .footer-left {
        color: #fff;
      }
      :deep(.iconfont) {
        color: #fff !important;
      }
    }
  }
  @media (max-width: 1200px) {
    min-height: 300px;
  }
  @media (max-width: 768px) {
    min-height: 260px;
    .top-right,
    .footer-right {
      display: none;
    }
  }
}
</style>
