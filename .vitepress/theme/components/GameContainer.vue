<template>
  <div class="game-container s-card">
    <div class="game-wrapper">
      <div v-if="loading" class="loading-overlay">
        <i class="iconfont icon-loading rotate"></i>
        <span>游戏加载中...</span>
      </div>
      <div v-else-if="error" class="error-overlay">
        <i class="iconfont icon-warning"></i>
        <span>{{ error }}</span>
        <button v-if="needsLogin" class="login-btn" @click="openLoginModal">
          去登录
        </button>
      </div>
      <iframe
        v-else-if="gameUrl"
        ref="gameFrame"
        :src="gameUrl"
        frameborder="0"
        allowfullscreen
        allow="autoplay; fullscreen; microphone; camera; midi"
        class="game-iframe"
      ></iframe>
    </div>
    <div class="game-controls">
      <button @click="toggleFullscreen" class="control-btn" title="全屏" :disabled="!gameUrl">
        <i class="iconfont icon-fullscreen"></i> 全屏
      </button>
      <span class="control-tip">如果游戏无法加载，请尝试刷新页面</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { launchGame } from '@/api/auth';
import { useData } from 'vitepress';

const props = defineProps({
  src: {
    type: String,
    required: false
  },
  gameId: {
    type: String,
    required: false
  }
});

const gameFrame = ref(null);
const gameUrl = ref(props.src || '');
const loading = ref(false);
const error = ref('');
const needsLogin = ref(false);

const { theme } = useData();

// 简单的事件总线或状态管理来触发登录弹窗
// 假设有一个全局方法或事件可以打开登录框，这里暂且留空
const openLoginModal = () => {
  // 可以在这里触发全局登录事件
  // window.dispatchEvent(new CustomEvent('open-login-modal'));
  alert('请点击右上角登录按钮进行登录');
};

const initGame = async () => {
  if (props.src) {
    gameUrl.value = props.src;
    return;
  }

  if (props.gameId) {
    loading.value = true;
    error.value = '';
    needsLogin.value = false;

    try {
      const data = await launchGame(props.gameId);
      if (data && data.launch_url && data.token) {
        // 构造带 Token 的 URL
        const separator = data.launch_url.includes('?') ? '&' : '?';
        gameUrl.value = `${data.launch_url}${separator}token=${data.token}`;
      } else {
        error.value = '无法获取游戏启动地址';
      }
    } catch (err) {
      console.error('Launch game failed:', err);
      if (err.status === 401 || err.status === 403) {
        error.value = '请先登录并购买游戏后游玩';
        needsLogin.value = true;
      } else {
        error.value = '启动游戏失败: ' + (err.message || '未知错误');
      }
    } finally {
      loading.value = false;
    }
  }
};

onMounted(() => {
  initGame();
});

// 监听 props 变化
watch(() => props.gameId, () => {
  initGame();
});

const toggleFullscreen = () => {
  if (!gameFrame.value) return;
  
  if (gameFrame.value.requestFullscreen) {
    gameFrame.value.requestFullscreen();
  } else if (gameFrame.value.webkitRequestFullscreen) { /* Safari */
    gameFrame.value.webkitRequestFullscreen();
  } else if (gameFrame.value.msRequestFullscreen) { /* IE11 */
    gameFrame.value.msRequestFullscreen();
  }
};
</script>

<style scoped lang="scss">
.game-container {
  margin: 1.5rem 0;
  padding: 10px;
  background: var(--main-card-background);
}

.game-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.loading-overlay, .error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #222;
  z-index: 10;
  gap: 15px;

  i {
    font-size: 40px;
    margin-bottom: 10px;
  }

  .rotate {
     animation: rotate 1.5s linear infinite; 
  }
}

.login-btn {
  padding: 8px 16px;
  background: var(--main-color);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    opacity: 0.9;
  }
}

.game-controls {
  display: flex;
  align-items: center;
  justify-content: space-between; /* Space between button and tip */
  margin-top: 10px;
  padding: 0 5px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid var(--main-border-color);
  border-radius: 4px;
  background: var(--main-card-second-background);
  color: var(--main-font-color);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;

  &:hover:not(:disabled) {
    background: var(--main-card-background);
    color: var(--main-color);
    border-color: var(--main-color);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  i {
    font-size: 16px;
  }
}

.control-tip {
  font-size: 12px;
  color: var(--main-font-second-color);
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
