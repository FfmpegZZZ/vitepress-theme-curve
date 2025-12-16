<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="auth-modal" @click.self="handleClose">
        <!-- Three.js 背景 -->
        <AuthBackground />
        
        <!-- 模态框内容 -->
        <div class="modal-content" @click.stop>
          <!-- 关闭按钮 -->
          <button class="close-btn" @click="handleClose" title="关闭">
            <i class="iconfont icon-close"></i>
          </button>

          <!-- 表单切换 -->
          <Transition :name="transitionName" mode="out-in">
            <LoginForm
              v-if="mode === 'login'"
              key="login"
              @success="handleSuccess"
              @switch-mode="switchMode"
            />
            <RegisterForm
              v-else
              key="register"
              @success="handleSuccess"
              @switch-mode="switchMode"
            />
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import AuthBackground from './AuthBackground.vue';
import LoginForm from './LoginForm.vue';
import RegisterForm from './RegisterForm.vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  defaultMode: {
    type: String,
    default: 'login', // 'login' or 'register'
  },
});

const emit = defineEmits(['update:show', 'success']);

const mode = ref(props.defaultMode);
const transitionName = ref('slide-left');

// 切换模式
const switchMode = (newMode) => {
  transitionName.value = newMode === 'register' ? 'slide-left' : 'slide-right';
  mode.value = newMode;
};

// 关闭模态框
const handleClose = () => {
  emit('update:show', false);
};

// 登录/注册成功
const handleSuccess = () => {
  emit('success');
  handleClose();
};

// ESC 键关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.show) {
    handleClose();
  }
};

// 监听 show 变化
watch(() => props.show, (newVal) => {
  if (newVal) {
    // 打开时重置为默认模式
    mode.value = props.defaultMode;
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
    // 监听 ESC 键
    window.addEventListener('keydown', handleKeydown);
  } else {
    // 恢复滚动
    document.body.style.overflow = '';
    // 移除监听
    window.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<style lang="scss" scoped>
.auth-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  background-color: var(--auth-overlay-bg);
}

.modal-content {
  position: relative;
  width: 90%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  
  /* Apple Glass Effect - 自适应深浅色 */
  background: var(--auth-modal-bg);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);
  
  border-radius: 20px;
  border: 1px solid var(--auth-modal-border);
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.2),
    0 0 0 1px var(--auth-border-color) inset;
    
  padding: 3rem 2.5rem;
  animation: modal-scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    max-width: 92%;
    border-radius: 16px;
  }
}

.close-btn {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  width: 30px;
  height: 30px;
  border: none;
  background: var(--auth-input-bg);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;

  .iconfont {
    font-size: 14px;
    color: var(--auth-text-secondary);
    font-weight: bold;
    transition: color 0.2s ease;
  }

  &:hover {
    background: var(--auth-input-bg-focus);
    .iconfont {
      color: var(--auth-text-primary);
    }
  }

  &:active {
    transform: scale(0.92);
  }
}

// 模态框淡入动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

// 表单切换动画 - 向左滑动
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

// 表单切换动画 - 向右滑动
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

// 模态框缩放动画
@keyframes modal-scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// 滚动条样式 - 自适应主题
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: var(--auth-input-bg);
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: var(--auth-text-tertiary);
  border-radius: 3px;

  &:hover {
    background: var(--auth-text-secondary);
  }
}
</style>
