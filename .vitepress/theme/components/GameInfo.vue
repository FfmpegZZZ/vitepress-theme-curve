<template>
  <div v-if="gameData" class="game-info s-card">
    <!-- 游戏标题 -->
    <div class="game-header">
      <div class="game-icon">
        <img v-if="gameData.icon && !gameData.icon.endsWith('.svg')" :src="gameData.icon" :alt="gameData.name" />
        <div v-else-if="gameData.icon && gameData.icon.endsWith('.svg')" class="svg-icon" v-html="svgContent"></div>
        <i v-else class="iconfont icon-game" />
      </div>
      <div class="game-title">
        <h3>{{ gameData.name }}</h3>
        <span v-if="gameData.version" class="version">v{{ gameData.version }}</span>
      </div>
    </div>

    <!-- 游戏信息 -->
    <div class="game-details">
      <!-- 安装包大小 -->
      <div v-if="gameData.size" class="detail-item">
        <i class="iconfont icon-download" />
        <div class="detail-content">
          <span class="label">安装包大小</span>
          <span class="value">{{ gameData.size }}</span>
        </div>
      </div>

      <!-- 系统要求 -->
      <div v-if="gameData.system" class="detail-item">
        <i class="iconfont icon-system" />
        <div class="detail-content">
          <span class="label">系统要求</span>
          <span class="value">{{ gameData.system }}</span>
        </div>
      </div>

      <!-- 开发商 -->
      <div v-if="gameData.developer" class="detail-item">
        <i class="iconfont icon-team" />
        <div class="detail-content">
          <span class="label">开发商</span>
          <span class="value">{{ gameData.developer }}</span>
        </div>
      </div>

      <!-- 发布日期 -->
      <div v-if="gameData.releaseDate" class="detail-item">
        <i class="iconfont icon-date" />
        <div class="detail-content">
          <span class="label">发布日期</span>
          <span class="value">{{ gameData.releaseDate }}</span>
        </div>
      </div>

      <!-- 语言支持 -->
      <div v-if="gameData.language" class="detail-item">
        <i class="iconfont icon-language" />
        <div class="detail-content">
          <span class="label">语言支持</span>
          <span class="value">{{ gameData.language }}</span>
        </div>
      </div>

      <!-- 游戏类型 -->
      <div v-if="gameData.genre" class="detail-item">
        <i class="iconfont icon-tag" />
        <div class="detail-content">
          <span class="label">游戏类型</span>
          <span class="value">{{ gameData.genre }}</span>
        </div>
      </div>

      <!-- 价格 -->
      <div v-if="gameData.price" class="detail-item">
        <i class="iconfont icon-money" />
        <div class="detail-content">
          <span class="label">价格</span>
          <span class="value">{{ gameData.price }}</span>
        </div>
      </div>

      <!-- 额外信息 -->
      <div v-if="gameData.extra" class="detail-item full-width">
        <i class="iconfont icon-info" />
        <div class="detail-content">
          <span class="label">额外信息</span>
          <span class="value">{{ gameData.extra }}</span>
        </div>
      </div>
    </div>

    <!-- 下载链接 -->
    <div v-if="gameData.download" class="game-download no-border">
      <a 
        :href="gameData.download" 
        class="download-btn" 
        :target="isExternalLink ? '_blank' : '_self'"
        @click="handleDownloadClick"
      >
        <i class="iconfont icon-download" />
        <span>立即下载</span>
      </a>
    </div>

    <!-- 装饰图标 -->
    <div class="game-bg-icon">
      <i class="iconfont icon-game" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  // 游戏数据
  gameData: {
    type: Object,
    default: null,
  },
});

const svgContent = ref('');

// 判断是否为外部链接
const isExternalLink = computed(() => {
  if (!props.gameData?.download) return false;
  const url = props.gameData.download;
  // 如果以 # 或 ### 开头，则为页面内锚点
  return !url.startsWith('#') && !url.startsWith('###');
});

// 处理下载按钮点击
const handleDownloadClick = (event) => {
  const url = props.gameData?.download;
  if (!url) return;
  
  // 如果是页面内锚点链接
  if (url.startsWith('#') || url.startsWith('###')) {
    event.preventDefault();
    
    // 处理 ###标题 格式，转换为标题的 id
    let targetId = url;
    if (url.startsWith('###')) {
      // 移除 ### 前缀，并转换为小写，替换空格为连字符
      targetId = url.replace(/^#+\s*/, '').trim();
    } else {
      // 移除开头的 #
      targetId = url.substring(1);
    }
    
    // 查找目标元素 - 尝试多种选择器
    let targetElement = null;
    
    // 1. 尝试直接通过 id 查找
    targetElement = document.getElementById(targetId);
    
    // 2. 如果没找到，尝试查找标题文本
    if (!targetElement) {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (const heading of headings) {
        if (heading.textContent.trim() === targetId) {
          targetElement = heading;
          break;
        }
      }
    }
    
    // 3. 如果还是没找到，尝试通过 URL 编码的 id 查找
    if (!targetElement) {
      const encodedId = encodeURIComponent(targetId);
      targetElement = document.getElementById(encodedId);
    }
    
    // 如果找到目标元素，平滑滚动到该位置
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // 添加高亮效果
      targetElement.style.transition = 'all 0.3s ease';
      targetElement.style.backgroundColor = 'var(--main-color-bg)';
      targetElement.style.padding = '0.5rem';
      targetElement.style.borderRadius = '8px';
      
      setTimeout(() => {
        targetElement.style.backgroundColor = '';
        targetElement.style.padding = '';
      }, 2000);
    } else {
      console.warn(`未找到锚点目标: ${targetId}`);
    }
  }
};

// 如果是 SVG 文件，加载 SVG 内容
onMounted(async () => {
  if (props.gameData?.icon && props.gameData.icon.endsWith('.svg')) {
    try {
      const response = await fetch(props.gameData.icon);
      svgContent.value = await response.text();
    } catch (error) {
      console.error('Failed to load SVG:', error);
    }
  }
});
</script>

<style lang="scss" scoped>
.game-info {
  position: relative;
  background: linear-gradient(135deg, 
    var(--main-card-second-background) 0%, 
    var(--main-card-background) 100%);
  padding: 24px;
  margin-top: 2rem;
  overflow: hidden;
  border: 1px solid var(--main-card-border);
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--main-color);
    box-shadow: 0 4px 20px rgba(var(--main-color-rgb), 0.2);
  }

  .game-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--main-card-border);

    .game-icon {
      width: 64px;
      height: 64px;
      margin-right: 16px;
      border-radius: 12px;
      overflow: hidden;
      background: var(--main-card-background);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .svg-icon {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(svg) {
          width: 80%;
          height: 80%;
        }
      }

      .iconfont {
        font-size: 36px;
        color: var(--main-color);
      }
    }

    .game-title {
      flex: 1;
      display: flex;
      align-items: baseline;
      gap: 12px;

      h3 {
        font-size: 24px;
        margin: 0;
        color: var(--main-font-color);
        font-weight: 600;
      }

      .version {
        padding: 4px 10px;
        background: var(--main-color-bg);
        color: var(--main-color);
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  .game-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
    margin-bottom: 20px;

    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: var(--main-card-background);
      border-radius: 8px;
      transition: all 0.3s ease;

      &:hover {
        background: var(--main-mask-Inverse-background);
        transform: translateY(-2px);
      }

      &.full-width {
        grid-column: 1 / -1;

        .detail-content {
          flex-direction: column;
          align-items: flex-start;

          .value {
            margin-top: 6px;
          }
        }
      }

      .iconfont {
        font-size: 20px;
        color: var(--main-color);
        margin-top: 2px;
        flex-shrink: 0;
      }

      .detail-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .label {
          font-size: 12px;
          opacity: 0.6;
          font-weight: 500;
        }

        .value {
          font-size: 14px;
          color: var(--main-font-color);
          font-weight: 500;
        }
      }
    }
  }

  .game-download {
    margin-top: 20px;
    display: flex;
    justify-content: center;

    .download-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 32px;
      background: var(--main-color);
      color: #fff;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(var(--main-color-rgb), 0.3);

      .iconfont {
        font-size: 18px;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(var(--main-color-rgb), 0.4);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  .game-bg-icon {
    position: absolute;
    top: -60px;
    right: -60px;
    opacity: 0.05;
    pointer-events: none;

    .iconfont {
      font-size: 200px;
      transform: rotate(20deg);
    }
  }

  @media (max-width: 768px) {
    padding: 16px;

    .game-header {
      .game-icon {
        width: 48px;
        height: 48px;
      }

      .game-title {
        flex-direction: column;
        gap: 6px;

        h3 {
          font-size: 20px;
        }

        .version {
          font-size: 12px;
        }
      }
    }

    .game-details {
      grid-template-columns: 1fr;
      gap: 12px;

      .detail-item {
        padding: 10px;
      }
    }

    .game-bg-icon {
      display: none;
    }
  }
}
</style>
