# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WUDU (`www.wudu.hk`) — a Chinese-language BL/耽美 game resource site built on VitePress with a custom theme (`vitepress-theme-curve` by imsyy). Deployed to Vercel. Posts are game entries with download links to multiple cloud-storage providers (百度/夸克/迅雷/UC/etc).

Package manager is **pnpm** (see `pnpm-lock.yaml`, `.npmrc` configures the npmmirror registry). Node ≥20.

## Commands

```bash
pnpm dev          # vitepress dev --host  (runs on port 9877, see config.mjs)
pnpm build        # vitepress build → .vitepress/dist
pnpm preview      # serve built output
pnpm lint         # eslint --fix on .js/.mjs/.vue/.ts
pnpm format       # prettier --write .
pnpm build:vercel # vercel build --prod
pnpm deploy:vercel
```

There are no tests in this project.

## Architecture

### How a build works
`.vitepress/config.mjs` is the entry. At config-evaluation time (i.e. *before* Vite starts), `getAllPosts()` in `.vitepress/theme/utils/getPostData.mjs` walks the `posts/**/*.md` tree with globby, parses front matter via `gray-matter`, and produces three derived datasets — `tagsData`, `categoriesData`, `archivesData`. These are injected into `themeConfig` and become accessible to every component via `useData().theme`. **Adding a new post type / front-matter field usually requires changes here, not in components.**

`themeConfig.mjs` (root) holds user-facing site config and is shallow-merged on top of the theme's defaults at `.vitepress/theme/assets/themeConfig.mjs` by `init.mjs`.

### Posts and front matter
Posts live under `posts/YYYY/NNN.md`. Recognised front-matter fields: `title`, `date`, `tags`, `categories`, `description`, `cover`, `top` (pin), `priority` (numeric, higher = sort earlier; takes precedence over `top`), `hidden` (excluded from listings *and* sitemap), and `gameInfo` (object with `name/system/developer/language/genre/price/releaseDate/download/icon` — drives the game-info card and SEO title/description).

Sort order in `comparePostPriority`: priority desc → top → date desc.

`srcExclude: ["**/README.md", "**/TODO.md"]` keeps repo docs out of the build.

### Dynamic SEO (`transformPageData` in config.mjs)
For each page this hook injects canonical link + Open Graph + Twitter Card + JSON-LD. Game posts (`frontmatter.gameInfo` present) get a synthesised `<title>` like `游戏名 - 系统 类型 下载` and a richer description; tag/category index pages (`pages/tags/*`, `pages/categories/*`) get their own pattern. The original title is preserved in `frontmatter.shortTitle` so navigation/breadcrumbs aren't polluted by the SEO suffix. JSON-LD comes from `theme/utils/structuredData.mjs`.

### Custom Markdown containers (`theme/utils/markdownConfig.mjs`)
On top of `markdown-it-attrs`, `vitepress-plugin-tabs`, and MathJax, this file defines several site-specific `:::` containers — modify here, not in component templates:

- `:::yunpan <网盘名> <url>` — cloud-storage download card (recognises 百度/夸克/阿里/迅雷/UC/天翼/123/蓝奏 with brand SVG icons; falls back to a generic icon)
- `:::offical <名称> <按钮文字> <url>` — official-website card
- `:::qiyou` / `:::mepay` — promo cards for 奇游加速器 and 魔储 MePay
- `:::timeline <title>`, `:::radio <state>`, `:::button <class>`, `:::card`
- `[spoiler]...[/spoiler]` — inline blur (custom inline rule)
- ` ```ad-<type> ` — Obsidian-style admonitions mapped to VitePress info/tip/warning/danger blocks

The image renderer wraps every image in a fancybox `<a>` (toggled by `themeConfig.fancybox.enable`).

### Routing & dynamic pages
- `index.md` is `layout: home`; `App.vue` switches between `Home` / `Post` / `Page` based on `frontmatter.layout` and whether the path matches `/posts/`.
- Pagination: `page/[num].md` + `page/[num].paths.mjs` generate `/page/2`, `/page/3`, … from `themeConfig.postSize`.
- Tag/category detail pages: `pages/tags/[name].md` + `[name].paths.mjs`, ditto categories.
- `cleanUrls: true` and a Vercel SPA-style rewrite to `/index.html` mean unknown paths render the 404 view client-side; do not rely on directory `index.html` fallbacks.

### Theme runtime
`.vitepress/theme/index.mjs` registers Pinia (with `pinia-plugin-persistedstate`), the `vitepress-plugin-tabs` client plugin, and the route hooks in `utils/initTools.mjs`. Two components (`LazyLoader`, `GameContainer`) are registered globally; everything else is auto-registered by `unplugin-vue-components` from `theme/components/**` and `theme/views/**` (see `.vitepress/components.d.ts` for the generated map — gitignored). `unplugin-auto-import` provides Vue + VitePress composables without explicit imports (see `.vitepress/auto-imports.d.ts`, also gitignored).

Path alias `@` → `.vitepress/theme` (set in `config.mjs`'s vite block).

### Auth system
There is a separate auth flow: `theme/store/authStore.js`, `theme/api/{auth,wallet}.js`, `theme/components/Auth/*` (login/register/reset modals + Cloudflare Turnstile). Configured in `theme/config/auth.config.js` against `https://auth.wudu.hk/api/v1`. State is persisted via Pinia's persistedstate plugin. `theme/AuthSystem_Walkthrough.md` is the authoritative usage doc; it is excluded from the build by `srcExclude`.

### PWA
`@vite-pwa/vitepress` is wired in with `selfDestroying: true` (so the SW unregisters itself after install). Runtime caching is set up for fonts/images and the iconfont CDN; `sitemap.xml`, `rss.xml`, and `robots.txt` are kept off the navigation fallback. RSS is generated in `buildEnd` via `theme/utils/generateRSS.mjs`.

### Edge functions
`edge-functions/api/proxy-download.js` proxies download URLs from a hard-coded whitelist of qiyou.cn / qijihezi.cn domains so the browser doesn't flag direct links. Vercel routes `/api/*` (see `vercel.json` rewrites + `transformHtml`'s `jumpRedirect` external-link redirect).

## Conventions worth knowing

- ESLint extends `airbnb-base` + `plugin:vue/vue3-essential`; rules force double quotes (`quotes: ["warn", "double"]`). Prettier: 100-col, 2-space, double quotes, trailing commas.
- The `.env` at the repo root is committed (it contains non-secret build config like API base URLs and the Turnstile site key — verify before treating any value there as secret).
- Console statements: in production builds, `console.log` is stripped by terser (`pure_funcs: ["console.log"]`); other levels are kept. ESLint's `no-console` is disabled.
- New post images go under `public/images/...` and are referenced with absolute paths (`/images/...`) in front matter and Markdown.
