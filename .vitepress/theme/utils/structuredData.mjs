/**
 * SEO 结构化数据生成工具
 * 生成 JSON-LD 格式的结构化数据，提升搜索引擎理解能力
 */

/**
 * 生成网站基础结构化数据 (WebSite)
 * @param {Object} siteConfig - 站点配置
 * @returns {Object} WebSite JSON-LD
 */
export function generateWebSiteSchema(siteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.title,
    description: siteConfig.seoDescription || siteConfig.description,
    url: siteConfig.site,
    author: {
      "@type": "Person",
      name: siteConfig.author?.name,
      url: siteConfig.author?.link,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.site}/pages/tags?keyword={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * 生成文章结构化数据 (Article)
 * @param {Object} pageData - 页面数据
 * @param {Object} siteConfig - 站点配置
 * @returns {Object} Article JSON-LD
 */
export function generateArticleSchema(pageData, siteConfig) {
  const frontmatter = pageData.frontmatter || {};
  const url = `${siteConfig.site}/${pageData.relativePath}`
    .replace(/index\.md$/, "")
    .replace(/\.md$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title || pageData.title,
    description: frontmatter.description || siteConfig.description,
    image: frontmatter.cover
      ? `${siteConfig.site}${frontmatter.cover}`
      : `${siteConfig.site}/images/logo/logo.webp`,
    datePublished: frontmatter.date
      ? new Date(frontmatter.date).toISOString()
      : undefined,
    dateModified: pageData.lastUpdated
      ? new Date(pageData.lastUpdated).toISOString()
      : undefined,
    author: {
      "@type": "Person",
      name: siteConfig.author?.name,
      url: siteConfig.author?.link,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.title,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.site}${siteConfig.logo}`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: [
      ...(frontmatter.tags || []),
      ...(frontmatter.categories || []),
    ].join(", "),
  };
}

/**
 * 生成游戏/软件应用结构化数据 (SoftwareApplication)
 * @param {Object} pageData - 页面数据
 * @param {Object} siteConfig - 站点配置
 * @returns {Object} SoftwareApplication JSON-LD
 */
export function generateGameSchema(pageData, siteConfig) {
  const frontmatter = pageData.frontmatter || {};
  const gameInfo = frontmatter.gameInfo || {};
  const url = `${siteConfig.site}/${pageData.relativePath}`
    .replace(/index\.md$/, "")
    .replace(/\.md$/, "");

  // 解析操作系统
  const operatingSystems = [];
  const systemStr = (gameInfo.system || "").toLowerCase();
  if (systemStr.includes("android")) operatingSystems.push("Android");
  if (systemStr.includes("ios")) operatingSystems.push("iOS");
  if (systemStr.includes("windows") || systemStr.includes("pc"))
    operatingSystems.push("Windows");
  if (systemStr.includes("mac")) operatingSystems.push("macOS");

  // 解析价格
  const priceStr = gameInfo.price || "";
  const isFree = priceStr.includes("免费") || priceStr.toLowerCase().includes("free");

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: gameInfo.name || frontmatter.title,
    description: frontmatter.description || siteConfig.description,
    image: frontmatter.cover
      ? `${siteConfig.site}${frontmatter.cover}`
      : gameInfo.icon
        ? `${siteConfig.site}${gameInfo.icon}`
        : `${siteConfig.site}/images/logo/logo.webp`,
    url: url,
    applicationCategory: "GameApplication",
    operatingSystem: operatingSystems.join(", ") || "Android, iOS",
    offers: {
      "@type": "Offer",
      price: isFree ? "0" : undefined,
      priceCurrency: "CNY",
      availability: "https://schema.org/InStock",
    },
    author: {
      "@type": "Organization",
      name: gameInfo.developer || siteConfig.author?.name,
    },
    datePublished: gameInfo.releaseDate || frontmatter.date,
    inLanguage: gameInfo.language || "zh-CN",
    genre: gameInfo.genre,
    aggregateRating: gameInfo.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: gameInfo.rating,
          bestRating: "5",
          worstRating: "1",
        }
      : undefined,
  };
}

/**
 * 生成面包屑导航结构化数据 (BreadcrumbList)
 * @param {Object} pageData - 页面数据
 * @param {Object} siteConfig - 站点配置
 * @returns {Object} BreadcrumbList JSON-LD
 */
export function generateBreadcrumbSchema(pageData, siteConfig) {
  const frontmatter = pageData.frontmatter || {};
  const relativePath = pageData.relativePath || "";
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "首页",
      item: siteConfig.site,
    },
  ];

  // 根据路径生成面包屑
  if (relativePath.startsWith("posts/")) {
    // 文章页面：首页 > 分类 > 文章标题
    const categories = frontmatter.categories || [];
    if (categories.length > 0) {
      items.push({
        "@type": "ListItem",
        position: 2,
        name: categories[0],
        item: `${siteConfig.site}/pages/categories/${encodeURIComponent(categories[0])}`,
      });
      items.push({
        "@type": "ListItem",
        position: 3,
        name: frontmatter.title || "文章",
      });
    } else {
      items.push({
        "@type": "ListItem",
        position: 2,
        name: frontmatter.title || "文章",
      });
    }
  } else if (relativePath.startsWith("pages/categories/")) {
    // 分类页面：首页 > 分类 > 分类名
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "分类",
      item: `${siteConfig.site}/pages/categories`,
    });
    const categoryName = frontmatter.title || decodeURIComponent(
      relativePath.replace("pages/categories/", "").replace(".md", "")
    );
    items.push({
      "@type": "ListItem",
      position: 3,
      name: categoryName,
    });
  } else if (relativePath.startsWith("pages/tags/")) {
    // 标签页面：首页 > 标签 > 标签名
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "标签",
      item: `${siteConfig.site}/pages/tags`,
    });
    const tagName = frontmatter.title || decodeURIComponent(
      relativePath.replace("pages/tags/", "").replace(".md", "")
    );
    items.push({
      "@type": "ListItem",
      position: 3,
      name: tagName,
    });
  } else if (relativePath.startsWith("pages/")) {
    // 其他页面：首页 > 页面标题
    items.push({
      "@type": "ListItem",
      position: 2,
      name: frontmatter.title || "页面",
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

/**
 * 根据页面类型生成完整的结构化数据
 * @param {Object} pageData - 页面数据
 * @param {Object} siteConfig - 站点配置
 * @returns {Array} JSON-LD 数组
 */
export function generateStructuredData(pageData, siteConfig) {
  const frontmatter = pageData.frontmatter || {};
  const relativePath = pageData.relativePath || "";
  const schemas = [];

  // 首页添加 WebSite schema
  if (relativePath === "index.md" || relativePath === "") {
    schemas.push(generateWebSiteSchema(siteConfig));
  }

  // 文章页面
  if (relativePath.startsWith("posts/")) {
    // 如果有游戏信息，生成 SoftwareApplication
    if (frontmatter.gameInfo) {
      schemas.push(generateGameSchema(pageData, siteConfig));
    } else {
      // 普通文章生成 Article
      schemas.push(generateArticleSchema(pageData, siteConfig));
    }
    // 添加面包屑
    schemas.push(generateBreadcrumbSchema(pageData, siteConfig));
  }

  // 分类/标签页面添加面包屑
  if (
    relativePath.startsWith("pages/categories/") ||
    relativePath.startsWith("pages/tags/")
  ) {
    schemas.push(generateBreadcrumbSchema(pageData, siteConfig));
  }

  return schemas;
}

/**
 * 将结构化数据转换为 HTML script 标签格式
 * @param {Array|Object} schemas - JSON-LD 数据
 * @returns {Array} head 配置数组
 */
export function schemasToHeadConfig(schemas) {
  const schemaArray = Array.isArray(schemas) ? schemas : [schemas];
  return schemaArray
    .filter(Boolean)
    .map((schema) => [
      "script",
      { type: "application/ld+json" },
      JSON.stringify(schema, null, 0),
    ]);
}
