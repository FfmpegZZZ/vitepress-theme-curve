<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="auth-modal">
        <!-- Three.js 背景 -->
        <AuthBackground />
        
        <!-- 模态框内容 -->
        <div class="modal-content">
          <!-- 关闭按钮 -->
          <button class="close-btn" @click="handleClose" title="关闭">
            <i class="iconfont icon-close"></i>
          </button>

          <!-- 表单切换区域 -->
          <div class="form-wrapper" ref="formWrapper" :style="{ height: wrapperHeight }">
            <Transition 
              :name="transitionName" 
              @before-enter="onBeforeEnter"
              @enter="onEnter"
              @after-enter="onAfterEnter"
              @before-leave="onBeforeLeave"
            >
              <LoginForm
                v-if="mode === 'login'"
                class="auth-form-component"
                @success="handleSuccess"
                @switch-mode="switchMode"
              />
              <RegisterForm
                v-else-if="mode === 'register'"
                class="auth-form-component"
                @success="handleSuccess"
                @switch-mode="switchMode"
              />
              <ResetPasswordForm
                v-else-if="mode === 'reset'"
                class="auth-form-component"
                @success="handleResetSuccess"
                @switch-mode="switchMode"
              />
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import AuthBackground from './AuthBackground.vue';
import LoginForm from './LoginForm.vue';
import RegisterForm from './RegisterForm.vue';
import ResetPasswordForm from './ResetPasswordForm.vue';

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
const formWrapper = ref(null);
const wrapperHeight = ref('auto');

// 切换模式
const switchMode = (newMode) => {
  transitionName.value = newMode === 'register' ? 'slide-left' : 'slide-right';
  mode.value = newMode;
};

// 动画钩子 - 处理高度平滑过渡
const onBeforeLeave = (el) => {
  if (formWrapper.value) {
    // 锁定当前高度，防止塌陷
    wrapperHeight.value = `${formWrapper.value.offsetHeight}px`;
  }
};

const onBeforeEnter = (el) => {
  // 确保进入的元素先不可见或透明? 
  // 实际上 CSS 已经处理了淡入
};

const onEnter = (el, done) => {
  // 在下一帧获取新元素的高度
  nextTick(() => {
    // 这里 el 是新插入的组件根元素
    // 我们需要将其高度应用到 wrapper 上
    // 如果 wrapperHeight 变化，CSS transition 会处理动画
    wrapperHeight.value = `${el.offsetHeight}px`;
    
    // 等待过渡完成
    // 注意：这里的 done 回调其实不是必须的，除非我们需要精确控制
    done();
  });
};

const onAfterEnter = (el) => {
  // 动画结束后，恢复 auto 高度以便适应如错误提示等内容变化
  // 为了防止 transitionend 事件还没触发就设为 auto 导致跳变，加个小延时或者监听 transitionend
  // 简单起见，利用 CSS transition 时间
  setTimeout(() => {
    wrapperHeight.value = 'auto';
  }, 300); // 必须与 CSS transition-duration 一致
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

// 密码重置成功（切换到登录页）
const handleResetSuccess = () => {
  mode.value = 'login';
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
    mode.value = props.defaultMode;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeydown);
    // 重置高度
    wrapperHeight.value = 'auto';
  } else {
    document.body.style.overflow = '';
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
  
  /* Apple Glass Effect */
  background: var(--auth-modal-bg);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);
  
  border-radius: 20px;
  border: 1px solid var(--auth-modal-border);
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.2),
    0 0 0 1px var(--auth-border-color) inset;
    
  padding: 3rem 2.5rem;
  /* 移除 modal-scale-in 动画到这里，还是保留？保留整个模态框的入场动画 */
  animation: modal-scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  /* 隐藏滚动条，因为内容在 wrapper 里滚动? 不，content 本身滚动 */
  scrollbar-width: none; 

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    max-width: 92%;
    border-radius: 16px;
  }
}

/* 高度动画容器 */
.form-wrapper {
  position: relative;
  transition: height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); /* 平滑的缓动曲线 */
  overflow: hidden; /* 裁剪溢出内容 */
  will-change: height;
}

.auth-form-component {
  width: 100%;
  /* 确保组件撑满容器 */
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

// 表单切换动画 - 通用
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

// 离开的元素必须绝对定位，以免占据空间导致布局跳动，
// 但因为我们锁定了 wrapper 高度，所以这很重要。
.slide-left-leave-active,
.slide-right-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

// Slide Left (Register -> Login) ?? No.
// Switch to Register (Right -> Left motion)
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

// Switch to Login (Left -> Right motion)
.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

// 模态框缩放动画
@keyframes modal-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
