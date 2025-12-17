<template>
  <div class="payment-result-container">
    <!-- 加载中 -->
    <div v-if="loading" class="result-state loading-state">
      <div class="spinner"></div>
      <p>正在同步支付结果...</p>
    </div>

    <!-- 支付成功 -->
    <div v-else-if="isPaid" class="result-state success-state">
      <div class="icon-wrapper success">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <h1>支付成功！</h1>
      <div class="order-details">
        <div class="detail-row">
          <span class="label">订单号</span>
          <span class="value">{{ orderInfo.order_no }}</span>
        </div>
        <div class="detail-row">
          <span class="label">支付金额</span>
          <span class="value amount">¥{{ orderInfo.amount }}</span>
        </div>
        <div class="detail-row" v-if="orderInfo.payment_method">
          <span class="label">支付方式</span>
          <span class="value">{{ getPaymentMethodText(orderInfo.payment_method) }}</span>
        </div>
        <div class="detail-row" v-if="orderInfo.paid_at">
          <span class="label">支付时间</span>
          <span class="value">{{ formatDate(orderInfo.paid_at) }}</span>
        </div>
      </div>
      <div class="actions">
        <button class="action-btn primary" @click="goToConsole">查看余额</button>
        <button class="action-btn secondary" @click="goHome">返回首页</button>
      </div>
    </div>

    <!-- 处理中 -->
    <div v-else-if="isPending" class="result-state pending-state">
      <div class="icon-wrapper pending">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <h1>支付处理中...</h1>
      <p class="description">我们正在等待支付结果确认，请稍候...</p>
      <div class="actions">
        <button class="action-btn primary" @click="manualRefresh">刷新状态</button>
        <button class="action-btn secondary" @click="goHome">返回首页</button>
      </div>
    </div>

    <!-- 支付失败或取消 -->
    <div v-else class="result-state error-state">
      <div class="icon-wrapper error">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      <h1>{{ failureTitle }}</h1>
      <p class="description">{{ failureMessage }}</p>
      
      <div class="order-details" v-if="orderInfo">
         <div class="detail-row">
          <span class="label">订单号</span>
          <span class="value">{{ orderInfo.order_no }}</span>
        </div>
        <div class="detail-row">
          <span class="label">金额</span>
          <span class="value">¥{{ orderInfo.amount }}</span>
        </div>
      </div>

      <div class="actions">
        <button class="action-btn primary" @click="goHome">返回首页</button>
        <button class="action-btn secondary" @click="contactSupport">联系客服</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { syncOrderStatus } from '../../api/wallet';

const loading = ref(true);
const orderInfo = ref(null);
const pollTimer = ref(null);
const retryCount = ref(0);
const MAX_RETRIES = 10; // 自动轮询次数限制

const isPaid = computed(() => orderInfo.value?.status?.toUpperCase() === 'PAID');
const isPending = computed(() => orderInfo.value?.status?.toUpperCase() === 'PENDING');

const failureTitle = computed(() => {
  const status = orderInfo.value?.status?.toUpperCase();
  if (status === 'CANCELLED') return '支付已取消';
  return '支付未完成';
});

const failureMessage = computed(() => {
  const status = orderInfo.value?.status?.toUpperCase();
  if (status === 'CANCELLED') return '该订单已被取消。';
  return '无法确认支付状态，请检查您的账户或联系客服。';
});

// 从URL获取参数
const getQueryParam = (name) => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPaymentMethodText = (method) => {
  if (!method) return '在线支付';
  const texts = {
    'alipay': '支付宝',
    'wechat': '微信支付',
  };
  return texts[method] || method;
};

const goToConsole = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/pages/console';
  }
};

const goHome = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};

const contactSupport = () => {
   // Placeholder for support contact
   window.open('mailto:support@example.com');
};

const checkStatus = async (outTradeNo) => {
  try {
    const response = await syncOrderStatus(outTradeNo);
    // 兼容 wrap 和 unwrappel data
    // 假设 api/wallet.js 中的 syncOrderStatus 返回的可能是 { data: ... } 也可能是直接的数据
    // user example sync response is plain object. wallet.js request often unwraps? NO, currently my wallet.js edit returned 'result' (full body)
    // 根据 user example result 有 id, order_no.
    
    // 我们做一个简单的检查
    const data = response.data || response; 
    
    orderInfo.value = data;

    if (data.status === 'PAID' || data.status === 'CANCELLED') {
      loading.value = false;
      stopPolling();
    } else if (data.status === 'PENDING') {
      // 继续轮询
      if (retryCount.value < MAX_RETRIES) {
        retryCount.value++;
        console.log(`Payment pending, retrying (${retryCount.value}/${MAX_RETRIES})...`);
        pollTimer.value = setTimeout(() => checkStatus(outTradeNo), 2000); // 2秒后重试
      } else {
        // 超过重试次数，显示等待/Pending状态，停止自动刷新，让用户手动刷
        loading.value = false;
        stopPolling();
      }
    } else {
      // 其他状态，停止加载
      loading.value = false;
      stopPolling();
    }
  } catch (error) {
    console.error('Sync error:', error);
    // 如果出错，也停止loading，显示之前的状态或者错误页面（如果没有orderInfo）
    // 如果是网络错误，可以重试
    if (retryCount.value < MAX_RETRIES) {
        retryCount.value++;
        pollTimer.value = setTimeout(() => checkStatus(outTradeNo), 3000); 
    } else {
        loading.value = false;
        if (!orderInfo.value) {
           // 甚至无法获取订单信息，可能需要在界面显示"查询失败"
           // 这里我们保留在当前页面，利用 failureTitle/Message (依赖 orderInfo, 如果 null 需要处理)
        }
    }
  }
};

const stopPolling = () => {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value);
    pollTimer.value = null;
  }
};

const manualRefresh = () => {
    const outTradeNo = getQueryParam('out_trade_no') || getQueryParam('order_no');
    if (outTradeNo) {
        loading.value = true;
        retryCount.value = 0; // Reset retries for manual refresh
        checkStatus(outTradeNo);
    } else {
       window.location.reload();
    }
};

onMounted(() => {
  // 1. 获取 out_trade_no
  const outTradeNo = getQueryParam('out_trade_no') || getQueryParam('order_no');
  
  if (!outTradeNo) {
    // 无法获取订单号，跳转失败页或显示错误
    console.error('Missing out_trade_no');
    loading.value = false;
    // 可以在 template 中处理 !orderInfo && !loading 的情况
    return;
  }

  // 2. 立即调用 sync 接口
  checkStatus(outTradeNo);
});

onUnmounted(() => {
  stopPolling();
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
  transition: all 0.3s ease;

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

  &.success {
    background: rgba(52, 199, 89, 0.15);
    color: #34C759;
  }

  &.pending {
    background: rgba(255, 149, 0, 0.15);
    color: #FF9500;
  }
  
  &.error {
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

.description {
  font-size: 15px;
  color: var(--auth-text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.order-details {
  background: var(--auth-input-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: left;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--auth-border-color);

  &:last-child {
    border-bottom: none;
  }

  .label {
    font-size: 14px;
    color: var(--auth-text-secondary);
  }

  .value {
    font-size: 14px;
    color: var(--auth-text-primary);
    font-weight: 500;

    &.amount {
      font-size: 20px;
      font-weight: 700;
      color: var(--auth-blue);
    }
  }
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

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;

  p {
    font-size: 15px;
    color: var(--auth-text-secondary);
    margin-top: 1rem;
  }
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--auth-input-border);
  border-top-color: var(--auth-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
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
