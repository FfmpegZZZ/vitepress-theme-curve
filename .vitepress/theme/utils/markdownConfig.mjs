import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";
import markdownItAttrs from "markdown-it-attrs";
import container from "markdown-it-container";

// markdown-it
const markdownConfig = (md, themeConfig) => {
  // 插件
  md.use(markdownItAttrs);
  md.use(tabsMarkdownPlugin);
  // timeline
  md.use(container, "timeline", {
    validate: (params) => params.trim().match(/^timeline\s+(.*)$/),
    render: (tokens, idx) => {
      const m = tokens[idx].info.trim().match(/^timeline\s+(.*)$/);
      if (tokens[idx].nesting === 1) {
        return `<div class="timeline">
                    <span class="timeline-title">${md.utils.escapeHtml(m[1])}</span>
                    <div class="timeline-content">`;
      } else {
        return "</div></div>\n";
      }
    },
  });
  // radio
  md.use(container, "radio", {
    render: (tokens, idx, _options, env) => {
      const token = tokens[idx];
      const check = token.info.trim().slice("radio".length).trim();
      if (token.nesting === 1) {
        const isChecked = md.renderInline(check, {
          references: env.references,
        });
        return `<div class="radio">
          <div class="radio-point ${isChecked}" />`;
      } else {
        return "</div>";
      }
    },
  });
  // button
  md.use(container, "button", {
    render: (tokens, idx, _options) => {
      const token = tokens[idx];
      const check = token.info.trim().slice("button".length).trim();
      if (token.nesting === 1) {
        return `<button class="button ${check}">`;
      } else {
        return "</button>";
      }
    },
  });
  // card
  md.use(container, "card", {
    render: (tokens, idx, _options) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        return `<div class="card">`;
      } else {
        return "</div>";
      }
    },
  });
  // yunpan - 云盘下载链接
  md.use(container, "yunpan", {
    render: (tokens, idx, _options) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        const info = token.info.trim().slice("yunpan".length).trim();
        // 解析参数: yunpan 百度网盘 https://pan.baidu.com/xxx
        const parts = info.split(/\s+/);
        const type = parts[0] || "网盘";
        const link = parts[1] || "";
        
        // 根据类型设置颜色和图标
        const typeConfig = {
          "百度网盘": { 
            color: "bg-blue-500", 
            icon: '<svg class="yunpan-brand-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M0 0m184.32 0l655.36 0q184.32 0 184.32 184.32l0 655.36q0 184.32-184.32 184.32l-655.36 0q-184.32 0-184.32-184.32l0-655.36q0-184.32 184.32-184.32Z" fill="#FFFFFF"></path><path d="M512 296.96a102.4 102.4 0 1 0 102.4 102.4 102.51264 102.51264 0 0 0-102.4-102.4m0-92.16a194.56 194.56 0 1 1-194.56 194.56 194.56 194.56 0 0 1 194.56-194.56z" fill="#61C3FA"></path><path d="M822.36416 741.632a179.4048 179.4048 0 0 1-253.27616-8.83712 46.08 46.08 0 0 1 2.27328-65.1264 46.08 46.08 0 0 1 65.1264 2.27328 87.04 87.04 0 1 0 4.3008-123.02336 46.08 46.08 0 0 1-65.1264-2.27328 46.08 46.08 0 0 1 2.27328-65.1264 179.2 179.2 0 0 1 244.4288 262.11328zM317.44 522.24a92.16 92.16 0 1 0 92.16 92.16 92.2624 92.2624 0 0 0-92.16-92.16m0-92.16a184.32 184.32 0 1 1-184.32 184.32 184.32 184.32 0 0 1 184.32-184.32z" fill="#61C3FA"></path><path d="M437.79072 753.96096l-65.83296-64.512 208.65024-213.01248 65.83296 64.512z" fill="#61C3FA"></path><path d="M512 593.92a194.78528 194.78528 0 0 1-194.56-194.56 46.08 46.08 0 0 1 46.08-46.08 46.08 46.08 0 0 1 46.08 46.08 102.4 102.4 0 0 0 204.8 0 46.08 46.08 0 0 1 92.16 0 194.78528 194.78528 0 0 1-194.56 194.56z" fill="#EC5A70"></path><path d="M378.88 942.08h133.12v81.92h-133.12a40.96 40.96 0 0 1-40.96-40.96 40.96 40.96 0 0 1 40.96-40.96z" fill="#EB566F"></path><path d="M512 942.08h133.12a40.96 40.96 0 0 1 40.96 40.96 40.96 40.96 0 0 1-40.96 40.96h-133.12v-81.92z" fill="#448BF7"></path></svg>'
          },
          "夸克网盘": { 
            color: "bg-purple-500", 
            icon: '<svg class="yunpan-brand-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M469.134884 976.133953c-110.258605-9.763721-215.516279-59.534884-290.768372-137.168372-75.490233-78.109767-113.830698-154.552558-132.167442-263.858604-4.762791-28.338605-5.477209-95.970233-1.190698-123.832558 10.24-68.822326 33.101395-134.072558 64.297675-184.32 88.349767-142.407442 236.710698-226.470698 399.598139-226.470698 69.536744 0 132.167442 12.621395 192.416744 39.054884 52.628837 23.099535 110.496744 64.297674 149.313489 106.448372 60.725581 65.964651 91.92186 122.165581 114.783255 206.943256 18.098605 66.917209 18.574884 160.982326 1.428838 227.423255-19.289302 73.585116-45.484651 126.213953-92.636279 184.55814-40.96 50.96186-84.063256 86.92093-140.740466 117.402791-59.534884 32.148837-114.545116 48.104186-184.08186 53.819534-34.053953 2.857674-47.151628 2.857674-80.253023 0z m84.063256-238.615813c11.668837-5.00093 20.71814-19.051163 20.718139-32.625117 0-23.337674 4.524651-49.771163 10.47814-61.44 12.145116-23.813953 28.338605-32.148837 77.395348-39.769302 19.051163-2.857674 38.578605-6.906047 43.341396-8.811163 13.573953-5.953488 24.766512-17.384186 32.148837-33.339535 6.667907-14.526512 6.906047-15.955349 6.906047-53.105116-0.23814-41.19814-1.666977-50.247442-15.955349-87.15907-21.194419-55.486512-76.91907-110.734884-132.167442-130.738604-11.430698-4.048372-33.577674-9.525581-49.294884-12.383256-26.195349-4.286512-31.196279-4.524651-53.819535-1.905117-44.770233 5.23907-72.394419 14.050233-103.352558 32.625117-19.527442 11.906977-20.956279 13.097674-44.532093 36.435349-34.530233 34.053953-52.390698 67.155349-63.345116 116.688372-19.051163 86.92093 15.47907 178.604651 87.873488 233.853023 30.243721 23.099535 74.537674 41.674419 106.686512 44.770232 27.624186 2.857674 66.67907 1.190698 76.91907-3.095813z" fill="#3A25DD"></path></svg>'
          },
          "阿里云盘": { 
            color: "bg-yellow-500", 
            icon: '<svg class="yunpan-brand-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M841.984 576.555A18.816 18.816 0 0 1 828.8 554.58c41.941-200.448-75.605-402.346-269.227-456.021-199.509-55.125-405.333 67.285-459.52 273.11v0.98a460.587 460.587 0 0 0 62.464 371.2 439.893 439.893 0 0 0 208.768 167.766c236.544 89.301 491.179-44.373 566.272-283.35a23.04 23.04 0 0 0-15.573-29.269l-80-22.442z m-393.13 194.133c-72.705-20.01-133.163-68.267-170.753-135.125a298.112 298.112 0 0 1-28.288-219.99C282.027 293.12 404.48 220.501 523.52 253.141c112.64 31.232 182.4 146.347 161.92 262.912a21.205 21.205 0 0 0 15.104 24.406l75.605 20.949a17.493 17.493 0 0 1 11.734 22.955c-47.36 142.933-195.115 225.834-338.987 186.325z" fill="#6666FF"></path></svg>'
          },
          "迅雷网盘": {
            color: "bg-blue-400",
            icon: '<svg class="yunpan-brand-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M432.64 407.04s199.68-217.6 468.48-322.56c0 0 12.8-5.12 2.56 7.68s-56.32 84.48-66.56 97.28l-35.84 33.28 17.92-5.12-35.84 79.36-46.08 46.08 33.28-10.24-38.4 92.16-40.96 40.96 35.84-20.48s-17.92 38.4-35.84 66.56c0 0 163.84 17.92 302.08 81.92 0 0-76.8 20.48-107.52 28.16l-33.28-7.68 15.36 10.24-35.84 15.36c-2.56 0-28.16-7.68-40.96-2.56 0 0 15.36 5.12 17.92 10.24l-38.4 15.36s-7.68 5.12-15.36 5.12c-5.12 0-38.4-7.68-48.64-2.56 0 0 20.48 10.24 28.16 10.24 0 0-12.8 17.92-122.88 23.04 0 0 81.92 227.84 79.36 258.56-2.56 30.72-48.64-35.84-48.64-35.84s-69.12-76.8-89.6-92.16c-20.48-15.36-79.36-25.6-204.8-104.96s-125.44-181.76-117.76-230.4c7.68-48.64 7.68-84.48-23.04-94.72s-81.92-23.04-189.44-25.6c0 0-17.92-12.8 12.8-12.8 30.72 2.56 112.64 2.56 156.16-5.12 48.64-10.24 66.56-25.6 104.96-20.48 38.4 5.12 87.04 17.92 140.8 71.68z" fill="#1390F2"></path></svg>'
          },
          "UC网盘": {
            color: "bg-orange-500",
            icon: '<svg class="yunpan-brand-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M48 48m139 0l650 0q139 0 139 139l0 650q0 139-139 139l-650 0q-139 0-139-139l0-650q0-139 139-139Z" fill="#FF9500"></path><path d="M437.742 815c-55.505 0-100.5-44.995-100.5-100.5S382.237 614 437.742 614s100.5 44.995 100.5 100.5S493.247 815 437.742 815z m0-55c25.129 0 45.5-20.371 45.5-45.5s-20.371-45.5-45.5-45.5-45.5 20.371-45.5 45.5 20.371 45.5 45.5 45.5z m-136.656-12.72c14.731 61.636 70.08 107.499 136.177 107.72h-0.02C228.242 863 172 703 172 675s0-110 76.818-204c76.817-94 76.424-107 48.424-165-18.667-38.667-60.414-42-125.242-10 60.161-85.333 130.575-128 211.242-128 65 2 155 58 155 128s-29 127-55 156-124 71-173 134c-32.667 42-37 100-13 174 1.314-4.336 2.595-8.576 3.844-12.72z m35.963-130.766c0.129-1.028 0.193-1.866 0.193-2.514 0-14 29-49.223 69-69s87-23 172 29 57 218 57 219c48 0 78.333 16.333 91 49-51.797 3.237-144.154 7.418-277.069 12.542 72.25-5.818 129.07-66.294 129.07-140.042 0-77.596-62.905-140.5-140.5-140.5-39.488 0-75.17 16.29-100.694 42.514zM443.242 503c43.333-30.667 108.333-26.333 195 13 130 59 112 48 165.314 58 53.314 10 47.686 48 46.686 48-15.333-12-52.333-6-111 18h-64c-8-17.333-26.333-42.667-55-76s-87.667-53.667-177-61z m95-44c70.667-31.333 115.333-56.333 134-75 12-190 64-29 66-27 81.333 38 118.885 95.667 112.655 173-57.103 4-91.655 4-103.655 0-50.748-29.333-120.415-53-209-71z" fill="#FFFFFF"></path></svg>'
          },
          "天翼云盘": { color: "bg-orange-500", icon: "📮" },
          "123云盘": { color: "bg-green-500", icon: "💾" },
          "蓝奏云": { color: "bg-indigo-500", icon: "🔗" },
        };
        
        const config = typeConfig[type] || { 
          color: "bg-gray-500", 
          icon: '<svg class="yunpan-brand-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M857.7 480h-97.8c5.3-20.5 8.1-41.9 8.1-64 0-141.4-114.6-256-256-256S256 274.6 256 416c0 22.1 2.8 43.5 8.1 64h-97.8C74.8 480 0 554.8 0 646.3v51.5C0 789.2 74.8 864 166.3 864h691.4c91.5 0 166.3-74.8 166.3-166.3v-51.5c0-91.4-74.8-166.2-166.3-166.2z"></path></svg>'
        };
        
        return `<div class="yunpan-container">
          <div class="yunpan-card">
            <div class="yunpan-header">
              <span class="yunpan-icon">${config.icon}</span>
              <span class="yunpan-type">${type}</span>
              <span class="yunpan-badge">可用</span>
            </div>
            ${link ? `<div class="yunpan-link">
              <a href="${link}" target="_blank" rel="noopener noreferrer" class="yunpan-btn" data-umami-event="网盘下载" data-umami-event-type="${type}" data-umami-event-link="${link}">
                <svg class="yunpan-download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                立即下载
              </a>
              <button class="yunpan-copy-btn" onclick="navigator.clipboard.writeText('${link}').then(() => alert('链接已复制，关注无度谢谢喵~')); if(window.umami) umami.track('网盘复制', {type: '${type}', link: '${link}'})">
                <svg class="yunpan-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>` : ""}`;
      } else {
        return `</div></div>`;
      }
    },
  });
  // offical - 官网链接容器
  md.use(container, "offical", {
    render: (tokens, idx, _options) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        const info = token.info.trim().slice("offical".length).trim();
        // 解析参数: offical 网站名称 按钮文字 https://example.com
        const parts = info.split(/\s+/);
        const name = parts[0] || "官方网站";
        const buttonText = parts[1] || "访问官网";
        const link = parts[2] || "";
        
        return `<div class="offical-container">
          <div class="offical-card">
            <div class="offical-header">
              <svg class="offical-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path d="M908.3904 415.8464l-121.856-212.2752a174.7968 174.7968 0 0 0-150.784-87.552l-244.7872-0.6144h-0.4096a174.848 174.848 0 0 0-150.784 87.04l-122.88 211.6608a174.7456 174.7456 0 0 0-0.4096 174.336l121.856 212.3264A174.848 174.848 0 0 0 389.12 888.064l244.7872 0.6144h0.4608a174.7968 174.7968 0 0 0 150.7328-86.784l122.88-211.712a174.7456 174.7456 0 0 0 0.4096-174.336z" fill="#7B79FF"></path>
                <path d="M488.8576 648.448a30.72 30.72 0 0 1-20.48-8.0896l-128-117.3504a30.72 30.72 0 1 1 41.5232-45.2608l101.888 93.6448 131.7376-188.3648a30.72 30.72 0 1 1 50.3296 35.2256l-151.808 217.088a30.4128 30.4128 0 0 1-21.8112 12.9024 24.9344 24.9344 0 0 1-3.3792 0.2048z" fill="#FFFFFF"></path>
              </svg>
              <span class="offical-type">${name}</span>
              <span class="offical-badge">官方</span>
            </div>
            ${link ? `<div class="offical-link">
              <a href="${link}" target="_blank" rel="noopener noreferrer" class="offical-btn" data-umami-event="官方链接" data-umami-event-name="${name}" data-umami-event-link="${link}">
                <svg class="offical-visit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                ${buttonText}
              </a>
              <button class="offical-copy-btn" onclick="navigator.clipboard.writeText('${link}').then(() => alert('官网链接已复制！')); if(window.umami) umami.track('官方复制', {name: '${name}', link: '${link}'})">
                <svg class="offical-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>` : ""}`;
      } else {
        return `</div></div>`;
      }
    },
  });
  // 表格
  md.renderer.rules.table_open = () => {
    return '<div class="table-container"><table>';
  };
  md.renderer.rules.table_close = () => {
    return "</table></div>";
  };
  // 图片
  md.renderer.rules.image = (tokens, idx) => {
    const token = tokens[idx];
    const src = token.attrs[token.attrIndex("src")][1];
    const alt = token.content;
    if (!themeConfig.fancybox.enable) {
      return `<img src="${src}" alt="${alt}" loading="lazy">`;
    }
    return `<a class="img-fancybox" href="${src}" data-fancybox="gallery" data-caption="${alt}">
                <img class="post-img" src="${src}" alt="${alt}" loading="lazy" />
                <span class="post-img-tip">${alt}</span>
              </a>`;
  };
  
  // obsidian admonition
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (...args) => {
    const [tokens, idx] = args;
    const token = tokens[idx];
    const lang = token.info.trim();

    // 处理 Obsidian admonition
    if (lang.startsWith('ad-')) {
      const type = lang.substring(3); // 取ad-之后的内容，获取类型
      const content = token.content;

      const admonitionTypes = {
        'note': 'info',
        'question': 'info',
        'warning': 'warning',
        'tip': 'tip',
        'summary': 'info',
        'hint': 'tip',
        'important': 'warning',
        'caution': 'warning',
        'error': 'danger',
        'danger': 'danger'
      };

      const className = admonitionTypes[type] || 'info';
      const title = type.toUpperCase();

      return `<div class="${className} custom-block">
            <p class="custom-block-title">${title}</p>
            <div class="custom-block-content">
              ${md.render(content)}
            </div>
    </div>`;
    }
    return fence(...args);
  };  

  // spoiler
  md.inline.ruler.push('spoiler', (state, silent) => {
    const marker = '[spoiler]';
    const markerEnd = '[/spoiler]';
    const max = state.posMax;
    const start = state.pos;

    if (state.src.slice(start, start + marker.length) !== marker) {
      return false;
    }

    if (silent) {
      return false;
    }

    const end = state.src.indexOf(markerEnd, start + marker.length);
    if (end === -1) {
      return false;
    }

    const content = state.src.slice(start + marker.length, end);

    const tokenOpen = state.push('spoiler_open', 'span', 1);
    tokenOpen.attrs = [['class', 'spoiler'], ['title', '你知道的太多了']];

    const tokenText = state.push('text', '', 0);
    tokenText.content = content;

    const tokenClose = state.push('spoiler_close', 'span', -1);

    state.pos = end + markerEnd.length;
    return true;
  });
};

export default markdownConfig;
