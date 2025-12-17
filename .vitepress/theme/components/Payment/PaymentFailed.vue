<template>
  <div class="payment-result-container">
    <div class="result-state failed-state">
      <div class="icon-wrapper failed">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      <h1>支付失败</h1>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="actions">
        <button class="action-btn primary" @click="goToDeposit">重新充值</button>
        <button class="action-btn secondary" @click="goHome">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const errorMessage = ref('未知错误');

// 从URL获取参数
const getQueryParam = (name) => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};

const errorMessages = {
  'parse_error': '参数解析失败',
  'verify_failed': '签名验证失败，请联系客服',
  'invalid_params': '无效的参数',
  'query_failed': '查询订单失败，请稍后重试',
  'timeout': '支付超时，请重新发起',
  'cancelled': '您已取消支付',
  'unknown': '未知错误，请联系客服',
};

const goToDeposit = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/pages/console#deposit';
  }
};

const goHome = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};

onMounted(() => {
  const reason = getQueryParam('reason');
  errorMessage.value = errorMessages[reason] || errorMessages['unknown'];
});
</script>

<style lang="scss" scoped>
@use '../../style/auth.scss';

.payment-result-container {
  max-width: 600px;
  margin: 4rem auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
    margin: 2rem auto;
  }
}

.result-state {
  background: var(--auth-modal-bg);
  backdrop-filter: blur(25px) saturate(180%);
  border-radius: 20px;
  border: 1px solid var(--auth-modal-border);
  padding: 3rem 2rem;
  text-align: center;

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
}

.icon-wrapper {
  width: 96px;
  height: 96px;
  margin: 0 auto 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &.failed {
    background: rgba(255, 59, 48, 0.15);
    color: #FF3B30;
  }

  svg {
    animation: fadeIn 0.5s ease;
  }
}

h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--auth-text-primary);
  margin: 0 0 1rem 0;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 24px;
  }
}

.error-message {
  font-size: 15px;
  color: var(--auth-error-text);
  margin-bottom: 2rem;
  line-height: 1.6;
  padding: 1rem;
  background: var(--auth-error-bg);
  border: 1px solid var(--auth-error-border);
  border-radius: 10px;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.action-btn {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &.primary {
    background: var(--auth-blue);
    color: white;

    &:hover {
      background: var(--auth-blue-hover);
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &.secondary {
    background: var(--auth-input-bg);
    color: var(--auth-text-primary);

    &:hover {
      background: var(--auth-input-bg-focus);
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
