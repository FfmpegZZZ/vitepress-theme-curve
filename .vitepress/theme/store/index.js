import { defineStore } from "pinia";

export { useAuthStore } from './authStore';


export const mainStore = defineStore("main", {
  state: () => {
    return {
      // 主题类别
      themeType: "auto",
      themeValue: "light",
      // banner
      bannerType: "half",
      // 加载状态
      loadingStatus: true,
      // 滚动高度
      scrollData: {
        // 滚动高度
        height: 0,
        // 滚动百分比
        percentage: 0,
        // 滚动方向
        direction: "down",
      },
      // 页脚可见性
      footerIsShow: false,
      // 中控台显示
      controlShow: false,
      // 搜索框显示
      searchShow: false,
      // 搜索历史（最近 5 条，最近在前）
      searchHistory: [],
      // 向量搜索模型加载状态
      vectorReady: false,
      vectorLoading: false,
      vectorProgress: { stage: "", percent: 0 },
      vectorError: null,
      // 个性化配置显示
      showSeetings: false,
      // 播放器数据
      playState: false,
      playerShow: true,
      playerVolume: 0.7,
      playerData: {
        name: "未知曲目",
        artist: "未知艺术家",
      },
      // 移动端菜单显示
      mobileMenuShow: false,
      // 使用自定义右键菜单
      useRightMenu: true,
      // 背景模糊
      backgroundBlur: false,
      // 全站字体
      fontFamily: "hmos",
      // 全站字体大小
      fontSize: 16,
      // 信息显示位置
      infoPosition: "fixed",
      // 上次滚动位置
      lastScrollY: 0,
      // 无限滚动：上次离开首页/标签/分类页时累积到的页索引（0-indexed）
      // -1 表示无需恢复。不持久化，仅供 SPA 内点击文章 → 返回 时的窗口恢复
      lastEndPageIndex: -1,
      // 与 lastEndPageIndex 配对的列表上下文 key（如 "home" / "tag:Windows" / "cat:游戏"）
      // 只在 key 匹配时才恢复 endPageIndex，避免跨过滤页错位
      lastListContext: "",
      // 站点背景
      backgroundType: "patterns",
      backgroundUrl: "https://tuapi.eees.cc/api.php?category={dongman,fengjing}&type=302",
    };
  },
  getters: {},
  actions: {
    // 切换应用状态
    changeShowStatus(value, blur = true) {
      this[value] = !this[value];
      // 阻止滚动
      document.body.style.overflowY = this[value] ? "hidden" : "";
      // 全局模糊
      const globalApp = document.getElementById("app");
      this[value] && this.backgroundBlur && blur
        ? globalApp.classList.add("blur")
        : globalApp.classList.remove("blur");
    },
    // 更改字体大小
    changeFontSize(isAdd = false) {
      if (isAdd) {
        if (this.fontSize < 20) {
          this.fontSize++;
        }
      } else {
        if (this.fontSize > 14) {
          this.fontSize--;
        }
      }
      const htmlElement = document.documentElement;
      htmlElement.style.fontSize = this.fontSize + "px";
    },
    // 确保向量模型已加载（懒加载 + 全局单例 + 进度回调）
    // Save-Data / 手机 用户全程禁用向量搜索，不下载 24MB 模型，搜索静默退化为 Pagefind。
    async ensureVectorLoaded() {
      if (this.vectorReady || this.vectorLoading) return;
      if (typeof navigator !== "undefined") {
        if (navigator.connection?.saveData) {
          if (!this._vectorSkipLogged) {
            console.info("[vector] Save-Data 模式已开启，跳过向量模型下载");
            this._vectorSkipLogged = true;
          }
          return;
        }
        // 手机端跳过：iPhone / iPod / Android 手机 / 主流移动浏览器（iPad/平板/桌面照常加载）
        const isPhone = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i
          .test(navigator.userAgent || "");
        if (isPhone) {
          if (!this._vectorSkipLogged) {
            console.info("[vector] 手机端跳过向量模型下载");
            this._vectorSkipLogged = true;
          }
          return;
        }
      }
      this.vectorLoading = true;
      this.vectorError = null;
      try {
        const mod = await import("@/utils/searchVector.mjs");
        await mod.enableVectorSearch((p) => {
          this.vectorProgress = p;
        });
        this.vectorReady = true;
      } catch (err) {
        this.vectorError = err?.message || "向量模型加载失败";
        console.error("[vector] 加载失败：", err);
      } finally {
        this.vectorLoading = false;
      }
    },
    // 添加一条搜索历史（去重 + 限制 5 条）
    addSearchHistory(query) {
      const q = (query || "").trim();
      if (!q) return;
      this.searchHistory = [q, ...this.searchHistory.filter((item) => item !== q)].slice(0, 5);
    },
    // 删除一条历史
    removeSearchHistoryItem(query) {
      this.searchHistory = this.searchHistory.filter((item) => item !== query);
    },
    // 清空全部历史
    clearSearchHistory() {
      this.searchHistory = [];
    },
    // 切换明暗模式
    changeThemeType() {
      // 禁止壁纸模式切换
      if (this.backgroundType === "image") {
        $message.warning("无法在壁纸模式下切换明暗模式", {
          duration: 1500,
        });
        return false;
      }
      this.themeType === "auto"
        ? (this.themeType = "dark")
        : this.themeType === "dark"
          ? (this.themeType = "light")
          : (this.themeType = "auto");
      // 弹窗提示
      if (typeof $message !== "undefined") {
        const text =
          this.themeType === "light"
            ? "浅色模式"
            : this.themeType === "dark"
              ? "深色模式"
              : "跟随系统";
        $message.info("当前主题为" + text, {
          duration: 1500,
        });
      }
    },
  },
  // 数据持久化
  persist: [
    {
      key: "siteData",
      paths: [
        "themeType",
        "bannerType",
        "useRightMenu",
        "playerShow",
        "playerVolume",
        "backgroundBlur",
        "backgroundType",
        "fontFamily",
        "fontSize",
        "infoPosition",
        "backgroundUrl",
        "searchHistory",
      ],
    },
  ],
});
