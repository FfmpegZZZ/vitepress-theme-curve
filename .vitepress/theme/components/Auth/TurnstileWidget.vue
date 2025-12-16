<template>
  <div ref="turnstileRef" class="turnstile-widget"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import authConfig from '../../config/auth.config';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  theme: {
    type: String,
    default: 'auto', // 'light', 'dark', 'auto'
  },
});

const emit = defineEmits(['update:modelValue', 'error', 'expired']);

const turnstileRef = ref(null);
let widgetId = null;
let scriptLoaded = false;

// 加载 Turnstile 脚本
const loadTurnstileScript = () => {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'));
    };
    
    document.head.appendChild(script);
  });
};

// 渲染 Turnstile 组件
const renderTurnstile = async () => {
  if (!turnstileRef.value || !window.turnstile) return;

  try {
    widgetId = window.turnstile.render(turnstileRef.value, {
      sitekey: authConfig.turnstileSiteKey,
      theme: props.theme,
      size: 'invisible', // 隐藏模式 - 不可见、无需用户交互
      callback: (token) => {
        emit('update:modelValue', token);
      },
      'error-callback': () => {
        emit('error');
        emit('update:modelValue', '');
      },
      'expired-callback': () => {
        emit('expired');
        emit('update:modelValue', '');
      },
    });
  } catch (error) {
    console.error('Turnstile render error:', error);
    emit('error');
  }
};

// 重置验证
const reset = () => {
  if (window.turnstile && widgetId !== null) {
    window.turnstile.reset(widgetId);
    emit('update:modelValue', '');
  }
};

// 监听主题变化
watch(() => props.theme, () => {
  if (widgetId !== null) {
    reset();
    // 重新渲染
    setTimeout(() => {
      renderTurnstile();
    }, 100);
  }
});

// 暴露方法给父组件
defineExpose({
  reset,
});

onMounted(async () => {
  try {
    await loadTurnstileScript();
    await renderTurnstile();
  } catch (error) {
    console.error('Failed to initialize Turnstile:', error);
    emit('error');
  }
});

onBeforeUnmount(() => {
  if (window.turnstile && widgetId !== null) {
    window.turnstile.remove(widgetId);
  }
});
</script>

<style lang="scss" scoped>
.turnstile-widget {
  display: flex;
  justify-content: center;
  margin: 0;
  /* 隐藏模式不需要预留高度 */
}
</style>
