import { defineConfig } from "vitepress";
import { createRssFile } from "./theme/utils/generateRSS.mjs";
import { withPwa } from "@vite-pwa/vitepress";
import {
  getAllPosts,
  getAllType,
  getAllCategories,
  getAllArchives,
  getHiddenPaths,
} from "./theme/utils/getPostData.mjs";
import { jumpRedirect } from "./theme/utils/commonTools.mjs";
import { getThemeConfig } from "./init.mjs";
import markdownConfig from "./theme/utils/markdownConfig.mjs";
import { generateStructuredData, schemasToHeadConfig } from "./theme/utils/structuredData.mjs";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import path from "path";

// 获取全局数据
const postData = await getAllPosts();
const hiddenPaths = await getHiddenPaths();

// 获取主题配置
const themeConfig = await getThemeConfig();

// https://vitepress.dev/reference/site-config
export default withPwa(
  defineConfig({
    title: themeConfig.siteMeta.title,
    // 使用SEO描述用于搜索引擎
    description: themeConfig.siteMeta.seoDescription || themeConfig.siteMeta.description,
    lang: themeConfig.siteMeta.lang,
    // 简洁的 URL
    cleanUrls: true,
    // 最后更新时间戳
    lastUpdated: true,
    // 主题
    appearance: "dark",
    // Head
    head: themeConfig.inject.header,
    // sitemap
    sitemap: {
      hostname: themeConfig.siteMeta.site,
      transformItems: (items) => {
        // 过滤掉隐藏的文章
        return items.filter((item) => !hiddenPaths.some((path) => item.url.includes(path)));
      },
    },
    // 主题配置
    themeConfig: {
      ...themeConfig,
      // 必要数据
      postData: postData,
      tagsData: getAllType(postData),
      categoriesData: getAllCategories(postData),
      archivesData: getAllArchives(postData),
    },
    // markdown
    markdown: {
      math: true,
      lineNumbers: true,
      toc: { level: [1, 2, 3] },
      image: {
        lazyLoading: true,
      },
      config: (md) => markdownConfig(md, themeConfig),
    },
    // 构建排除
    srcExclude: ["**/README.md", "**/TODO.md"],
    // transformHead
    transformPageData: async (pageData) => {
      // canonical URL
      const canonicalUrl = `${themeConfig.siteMeta.site}/${pageData.relativePath}`
        .replace(/index\.md$/, "")
        .replace(/\.md$/, "");
      pageData.frontmatter.head ??= [];
      pageData.frontmatter.head.push(["link", { rel: "canonical", href: canonicalUrl }]);
      
      // 动态SEO - 为每个页面添加Open Graph和Twitter Card
      let title = pageData.frontmatter.title || themeConfig.siteMeta.title;
      
      // 如果是游戏文章，生成更丰富的 SEO 标题
      if (pageData.frontmatter.gameInfo) {
        // 保存原始短标题供导航栏使用
        pageData.frontmatter.shortTitle = title;
        
        const gameInfo = pageData.frontmatter.gameInfo;
        const system = gameInfo.system ? gameInfo.system.replace(/\//g, ' ') : '';
        const genre = gameInfo.genre || '';
        
        // 构造 SEO 标题: 游戏名 - 系统 类型 下载
        // 例如: 新世界狂欢 - Android iOS 回合制RPG 下载
        const seoTitleParts = [title];
        if (system) seoTitleParts.push(system);
        if (genre) seoTitleParts.push(genre);
        seoTitleParts.push('下载');
        
        // 更新页面标题（这将影响 <title> 标签）
        title = seoTitleParts.join(' ');
        pageData.title = title;
      }

      const description = pageData.frontmatter.description || themeConfig.siteMeta.seoDescription || themeConfig.siteMeta.description;
      const cover = pageData.frontmatter.cover 
        ? `${themeConfig.siteMeta.site}${pageData.frontmatter.cover}`
        : `${themeConfig.siteMeta.site}/images/logo/logo.webp`;
      
      // 根据文章标签生成关键词
      const tags = pageData.frontmatter.tags || [];
      const categories = pageData.frontmatter.categories || [];
      const gameName = pageData.frontmatter.gameInfo?.name || '';
      const pageKeywords = [...tags, ...categories, gameName, 'BL游戏', '游戏下载'].filter(Boolean).join(',');
      
      // Open Graph
      pageData.frontmatter.head.push(["meta", { property: "og:title", content: title }]);
      pageData.frontmatter.head.push(["meta", { property: "og:description", content: description }]);
      pageData.frontmatter.head.push(["meta", { property: "og:image", content: cover }]);
      pageData.frontmatter.head.push(["meta", { property: "og:url", content: canonicalUrl }]);
      pageData.frontmatter.head.push(["meta", { property: "og:type", content: pageData.relativePath.startsWith('posts/') ? 'article' : 'website' }]);
      pageData.frontmatter.head.push(["meta", { property: "og:site_name", content: themeConfig.siteMeta.title }]);
      pageData.frontmatter.head.push(["meta", { property: "og:locale", content: "zh_CN" }]);
      
      // Twitter Card
      pageData.frontmatter.head.push(["meta", { name: "twitter:card", content: "summary_large_image" }]);
      pageData.frontmatter.head.push(["meta", { name: "twitter:title", content: title }]);
      pageData.frontmatter.head.push(["meta", { name: "twitter:description", content: description }]);
      pageData.frontmatter.head.push(["meta", { name: "twitter:image", content: cover }]);
      
      // 页面专属关键词
      if (pageKeywords) {
        pageData.frontmatter.head.push(["meta", { name: "keywords", content: pageKeywords }]);
      }
      
      // JSON-LD 结构化数据
      const schemas = generateStructuredData(pageData, themeConfig.siteMeta);
      const schemaHeadConfigs = schemasToHeadConfig(schemas);
      pageData.frontmatter.head.push(...schemaHeadConfigs);
    },
    // transformHtml
    transformHtml: (html) => {
      return jumpRedirect(html, themeConfig);
    },
    // buildEnd
    buildEnd: async (config) => {
      await createRssFile(config, themeConfig);
    },
    // vite
    vite: {
      plugins: [
        AutoImport({
          imports: ["vue", "vitepress"],
          dts: ".vitepress/auto-imports.d.ts",
        }),
        Components({
          dirs: [".vitepress/theme/components", ".vitepress/theme/views"],
          extensions: ["vue", "md"],
          include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
          dts: ".vitepress/components.d.ts",
        }),
      ],
      resolve: {
        // 配置路径别名
        alias: {
          // eslint-disable-next-line no-undef
          "@": path.resolve(__dirname, "./theme"),
        },
      },
      css: {
        preprocessorOptions: {
          scss: {
            silenceDeprecations: ["legacy-js-api"],
          },
        },
      },
      // 服务器
      server: {
        port: 9877,
      },
      // 构建
      build: {
        minify: "terser",
        terserOptions: {
          compress: {
            pure_funcs: ["console.log"],
          },
        },
      },
    },
    // PWA
    pwa: {
      registerType: "autoUpdate",
      selfDestroying: true,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // 资源缓存
        runtimeCaching: [
          {
            urlPattern: /(.*?)\.(woff2|woff|ttf|css)/,
            handler: "CacheFirst",
            options: {
              cacheName: "file-cache",
            },
          },
          {
            urlPattern: /(.*?)\.(ico|webp|png|jpe?g|svg|gif|bmp|psd|tiff|tga|eps)/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
            },
          },
          {
            urlPattern: /^https:\/\/cdn2\.codesign\.qq\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "iconfont-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 2,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // 缓存文件
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,gif,svg,woff2,ttf}"],
        // 排除路径
        navigateFallbackDenylist: [/^\/sitemap.xml$/, /^\/rss.xml$/, /^\/robots.txt$/],
      },
      manifest: {
        name: themeConfig.siteMeta.title,
        short_name: themeConfig.siteMeta.title,
        description: themeConfig.siteMeta.seoDescription || themeConfig.siteMeta.description,
        display: "standalone",
        start_url: "/",
        theme_color: "#fff",
        background_color: "#efefef",
        icons: [
          {
            src: "/images/logo/favicon-32x32.webp",
            sizes: "32x32",
            type: "image/webp",
          },
          {
            src: "/images/logo/favicon-96x96.webp",
            sizes: "96x96",
            type: "image/webp",
          },
          {
            src: "/images/logo/favicon-256x256.webp",
            sizes: "256x256",
            type: "image/webp",
          },
          {
            src: "/images/logo/favicon-512x512.webp",
            sizes: "512x512",
            type: "image/webp",
          },
        ],
      },
    },
  }),
);
