<!-- 阅读引导弹窗 - 首次访问文章时显示 -->
<template>
  <Teleport to="body">
    <Transition name="fade" mode="out-in">
      <div v-if="show" class="read-guide">
        <div class="guide-mask" />
        <div class="guide-main s-card">
          <!-- 标题 -->
          <div class="guide-header">
            <i class="iconfont icon-info"></i>
            <span class="guide-title">温馨提示</span>
          </div>
          
          <!-- 内容 -->
          <div class="guide-content">
            <p class="guide-text">
              欢迎阅读本文！在您继续之前，诚邀您关注我的社交媒体或加入交流群，与更多小伙伴一起交流互动～
            </p>
            
            <!-- 引导链接 -->
            <div class="guide-links">
              <a href="/pages/social" class="guide-link social">
                <div class="link-icon">
                  <i class="iconfont icon-link"></i>
                </div>
                <div class="link-info">
                  <span class="link-title">关注社交平台</span>
                  <span class="link-desc">B站、抖音、微博等</span>
                </div>
                <i class="iconfont icon-arrow-right link-arrow"></i>
              </a>
              
              <a href="/pages/qqgroup" class="guide-link qq">
                <div class="link-icon">
                  <i class="iconfont icon-qq"></i>
                </div>
                <div class="link-info">
                  <span class="link-title">加入QQ群</span>
                  <span class="link-desc">与小伙伴一起交流</span>
                </div>
                <i class="iconfont icon-arrow-right link-arrow"></i>
              </a>
            </div>
          </div>
          
          <!-- 底部 -->
          <div class="guide-footer">
            <span class="countdown-text">
              {{ countdown > 0 ? `${countdown}秒后可关闭` : '感谢您的支持' }}
            </span>
            <button 
              :class="['close-btn', { disabled: countdown > 0 }]" 
              :disabled="countdown > 0"
              @click="closeGuide"
            >
              {{ countdown > 0 ? countdown : '继续阅读' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

// 倒计时
const countdown = ref(3);
let timer = null;

// 关闭弹窗
const closeGuide = () => {
  if (countdown.value > 0) return;
  emit('close');
};

// 监听显示状态
watch(
  () => props.show,
  (val) => {
    if (val) {
      // 开始倒计时
      countdown.value = 3;
      document.body.style.overflowY = 'hidden';
      timer = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
          clearInterval(timer);
          timer = null;
        }
      }, 1000);
    } else {
      document.body.style.overflowY = '';
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
  },
);

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
  }
  document.body.style.overflowY = '';
});
</script>

<style lang="scss" scoped>
.read-guide {
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  z-index: 2001;

  .guide-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    background-color: var(--main-mask-background);
    backdrop-filter: blur(4px);
  }

  .guide-main {
    position: relative;
    width: calc(100% - 40px);
    max-width: 420px;
    padding: 0;
    animation: fade-up 0.4s ease-out forwards;
    overflow: hidden;
    border-radius: 16px;

    .guide-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--main-card-border);
      background-color: var(--main-card-background);

      .iconfont {
        font-size: 1.2rem;
        color: var(--main-color);
      }

      .guide-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--main-font-color);
      }
    }

    .guide-content {
      padding: 20px;

      .guide-text {
        font-size: 0.9rem;
        line-height: 1.6;
        color: var(--main-font-second-color);
        margin-bottom: 20px;
        text-align: center;
      }

      .guide-links {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .guide-link {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          border-radius: 12px;
          background-color: var(--main-background);
          border: 1px solid var(--main-card-border);
          text-decoration: none;
          color: var(--main-font-color);
          transition: all 0.3s;
          position: relative;
          overflow: hidden;

          &::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 3px;
            height: 100%;
            background-color: var(--link-color);
            transform: scaleY(0);
            transition: transform 0.3s;
          }

          &:hover {
            transform: translateX(4px);
            border-color: var(--link-color);
            box-shadow: 0 4px 12px -2px var(--main-border-shadow);

            &::before {
              transform: scaleY(1);
            }

            .link-icon {
              color: var(--link-color);
              transform: scale(1.05);
            }

            .link-arrow {
              transform: translateX(4px);
              color: var(--link-color);
            }
          }

          &.social {
            --link-color: #1890ff;
          }

          &.qq {
            --link-color: #12B7F5;
          }

          .link-icon {
            width: 44px;
            height: 44px;
            min-width: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background-color: var(--main-card-background);
            margin-right: 12px;
            transition: all 0.3s;

            .iconfont {
              font-size: 1.4rem;
              color: var(--link-color);
            }
          }

          .link-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;

            .link-title {
              font-size: 0.95rem;
              font-weight: 600;
              color: var(--main-font-color);
            }

            .link-desc {
              font-size: 0.8rem;
              color: var(--main-font-second-color);
            }
          }

          .link-arrow {
            font-size: 1rem;
            color: var(--main-font-second-color);
            transition: all 0.3s;
          }
        }
      }
    }

    .guide-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--main-card-border);
      background-color: var(--main-card-background);

      .countdown-text {
        font-size: 0.85rem;
        color: var(--main-font-second-color);
      }

      .close-btn {
        padding: 8px 20px;
        font-size: 0.9rem;
        font-weight: 500;
        border: none;
        border-radius: 8px;
        background-color: var(--main-color);
        color: #fff;
        cursor: pointer;
        transition: all 0.3s;
        min-width: 90px;
        font-family: var(--main-font-family);

        &:hover:not(.disabled) {
          transform: scale(1.02);
          box-shadow: 0 4px 12px -2px var(--main-color);
        }

        &.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background-color: var(--main-card-border);
          color: var(--main-font-second-color);
        }
      }
    }
  }
}

// 动画
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
