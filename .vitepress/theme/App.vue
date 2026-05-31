<template>
  <!-- 背景图片 -->
  <Background />
  <!-- 加载提示 -->
  <Loading />
  <!-- 导航栏 -->
  <Nav />
  <!-- 主内容 -->
  <main :class="['mian-layout', { loading: loadingStatus, 'is-post': isPostPage }]">
    <!-- 404 -->
    <NotFound v-if="page.isNotFound" />
    <!-- 首页 -->
    <Home v-if="frontmatter.layout === 'home'" showHeader />
    <!-- 页面 -->
    <template v-else>
      <!-- 文章页面 -->
      <Post v-if="isPostPage" />
      <!-- 普通页面 -->
      <Page v-else-if="!page.isNotFound" />
    </template>
  </main>
  <!-- 页脚 -->
  <FooterLink v-show="!loadingStatus" :showBar="isPostPage && !page.isNotFound" />
  <Footer v-show="!loadingStatus" />
  <!-- 悬浮菜单 -->
  <Teleport to="body">
    <!-- 左侧菜单 -->
    <div :class="['left-menu', { hidden: footerIsShow }]">
      <!-- 全局设置 -->
      <Settings />
    </div>
  </Teleport>
  <!-- 右键菜单 -->
  <RightMenu ref="rightMenuRef" />
  <!-- 全局消息 -->
  <Message />
  <!-- 阅读引导弹窗 - 暂时禁用 -->
  <!-- <ReadGuide :show="showReadGuide" @close="closeReadGuide" /> -->
</template>

<script setup>
import { storeToRefs } from "pinia";
import { mainStore, useAuthStore } from "@/store";
import { calculateScroll, specialDayGray } from "@/utils/helper";

const route = useRoute();
const router = useRouter();
const store = mainStore();
const { frontmatter, page, theme } = useData();
const { loadingStatus, footerIsShow, themeValue, themeType, backgroundType, fontFamily, fontSize } =
  storeToRefs(store);

// 右键菜单
const rightMenuRef = ref(null);

// 阅读引导弹窗
const showReadGuide = ref(false);
const READ_GUIDE_KEY = "read_guide_shown";
const hasCheckedGuide = ref(false); // 防止重复检查

// 判断是否为文章页面
const isPostPage = computed(() => {
  const routePath = decodeURIComponent(route.path);
  return routePath.includes("/posts/");
});

// 检查是否需要显示引导弹窗
const checkShowReadGuide = () => {
  // 只在文章页面显示，且未检查过
  if (!isPostPage.value || hasCheckedGuide.value) return;
  
  // 检查 localStorage 是否已显示过
  try {
    const hasShown = localStorage.getItem(READ_GUIDE_KEY);
    if (!hasShown) {
      hasCheckedGuide.value = true;
      // 延迟显示，等待页面加载完成
      setTimeout(() => {
        showReadGuide.value = true;
      }, 800);
    }
  } catch (e) {
    // localStorage 不可用时不显示
    console.warn("localStorage 不可用", e);
  }
};

// 关闭引导弹窗
const closeReadGuide = () => {
  showReadGuide.value = false;
  try {
    localStorage.setItem(READ_GUIDE_KEY, "1");
  } catch (e) {
    console.warn("localStorage 写入失败", e);
  }
};

// 监听路由变化，检查是否需要显示引导弹窗
watch(
  () => route.path,
  () => {
    nextTick(() => {
      checkShowReadGuide();
    });
  },
  { immediate: true }
);

// 开启右键菜单
const openRightMenu = (e) => {
  rightMenuRef.value?.openRightMenu(e);
};

// Ctrl/Cmd+K 唤起搜索
const handleSearchShortcut = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === "k") {
    e.preventDefault();
    store.changeShowStatus("searchShow");
  }
};

// 复制时触发
const copyTip = () => {
  const copiedText = window.getSelection().toString();
  // 检查文本内容是否不为空
  if (copiedText.trim().length > 0 && typeof $message !== "undefined") {
    $message.success("复制成功，在转载时请标注本文地址");
  }
};

// 更改正确主题类别
const changeSiteThemeType = () => {
  // 主题 class
  const themeClasses = {
    dark: "dark",
    light: "light",
    auto: "auto",
  };
  // 必要数据
  const htmlElement = document.documentElement;
  console.log("当前模式：", themeType.value);
  // 清除所有 class
  Object.values(themeClasses).forEach((themeClass) => {
    htmlElement.classList.remove(themeClass);
  });
  // 添加新的 class
  if (themeType.value === "auto") {
    // 根据当前操作系统颜色方案更改明暗主题
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const autoThemeClass = systemPrefersDark ? themeClasses.dark : themeClasses.light;
    htmlElement.classList.add(autoThemeClass);
    themeValue.value = autoThemeClass;
  } else if (themeClasses[themeType.value]) {
    htmlElement.classList.add(themeClasses[themeType.value]);
    themeValue.value = themeClasses[themeType.value];
  }
  if (backgroundType.value === "image") {
    htmlElement.classList.add("image");
  } else {
    htmlElement.classList.remove("image");
  }
};

// 切换系统字体样式
const changeSiteFont = () => {
  try {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove("lxgw", "hmos");
    htmlElement.classList.add(fontFamily.value);
    htmlElement.style.fontSize = fontSize.value + "px";
  } catch (error) {
    console.error("切换系统字体样式失败", error);
  }
};

// 监听设置变化
watch(
  () => [themeType.value, backgroundType.value],
  () => changeSiteThemeType(),
);
watch(
  () => fontFamily.value,
  () => changeSiteFont(),
);

onMounted(() => {
  console.log(frontmatter.value, page.value, theme.value);
  // 初始化认证状态
  const authStore = useAuthStore();
  authStore.init();
  // 全站置灰
  specialDayGray();
  // 更改主题类别
  changeSiteThemeType();
  // 切换系统字体样式
  changeSiteFont();
  // 兜底：避免 loadingStatus 卡在 true 导致整个 <main> 被 .loading 的 display:none 隐藏
  // （observed bug: 直接访问 /posts/* 时 routeChange("after") 的 setTimeout 偶发不触发）
  setTimeout(() => {
    if (loadingStatus.value) {
      console.warn("[App] loadingStatus 卡住，强制释放");
      loadingStatus.value = false;
    }
  }, 1500);

  // —— 简单粗暴：把所有 SPA 导航改成 full reload ——
  // VitePress SPA 跨页时偶发 hydration/渲染失败（首页→文章→返回首页连锁失效）。
  // 直接覆盖 router.onBeforeRouteChange，所有 router.go() 调用一律走浏览器全量刷新，
  // 让每次导航都走静态 SSR HTML，规避所有 SPA 状态相关的 bug。代价：稍慢，但稳。
  router.onBeforeRouteChange = (to) => {
    if (typeof window === "undefined") return;
    window.location.href = to;
    return false; // 取消 SPA 导航
  };
  // 浏览器前进/后退也强制重载（VitePress 的 popstate 不走 onBeforeRouteChange）
  window.addEventListener("popstate", () => {
    window.location.reload();
  });
  // 滚动监听
  window.addEventListener("scroll", calculateScroll);
  // 右键监听
  window.addEventListener("contextmenu", openRightMenu);
  // 复制监听
  window.addEventListener("copy", copyTip);
  // 搜索快捷键
  window.addEventListener("keydown", handleSearchShortcut);
  // 监听系统颜色
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeSiteThemeType);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", calculateScroll);
  window.removeEventListener("contextmenu", openRightMenu);
  window.removeEventListener("keydown", handleSearchShortcut);
});
</script>

<style lang="scss" scoped>
.mian-layout {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  // 手动实现加载动画
  animation: show 0.5s forwards;
  animation-duration: 0.5s;
  display: block;
  // 注意：曾经有 `&.loading { display: none }` 的写法，
  // 一旦 loadingStatus 卡在 true（observed bug：直接访问 /posts/* 时偶发不释放），
  // 会把整篇文章和页面所有内容隐藏掉，只剩 Loading 全屏遮罩。
  // Loading 组件本身已是 z-index: 9999 的全屏遮罩，能盖住任何加载中的内容，
  // 所以这里不需要再额外用 display:none 把 main 隐起来。
  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
    &.is-post {
      padding: 0;
    }
  }
}
.left-menu {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 1002;
  transition:
    opacity 0.3s,
    transform 0.3s;
  &.hidden {
    opacity: 0;
    transform: translateY(100px);
  }
}
</style>
