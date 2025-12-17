<template>
  <div class="payment-result-container">
    <!-- 加载中 -->
    <div v-if="loading" class="result-state loading-state">
      <div class="spinner"></div>
      <p>正在确认支付结果...</p>
    </div>

    <!-- 支付成功 -->
    <div v-else-if="orderInfo?.status === 'paid'" class="result-state success-state">
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
          <span class="label">充值金额</span>
          <span class="value amount">¥{{ orderInfo.amount }}</span>
        </div>
        <div class="detail-row">
          <span class="label">支付方式</span>
          <span class="value">{{ getPaymentMethodText(orderInfo.payment_method) }}</span>
        </div>
        <div class="detail-row" v-if="orderInfo.paid_at">
          <span class="label">到账时间</span>
          <span class="value">{{ formatDate(orderInfo.paid_at) }}</span>
        </div>
      </div>
      <div class="actions">
        <button class="action-btn primary" @click="goToConsole">查看余额</button>
        <button class="action-btn secondary" @click="goHome">返回首页</button>
      </div>
    </div>

    <!-- 处理中 -->
    <div v-else class="result-state pending-state">
      <div class="icon-wrapper pending">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <h1>支付处理中...</h1>
      <p class="description">您的支付正在处理，请稍后刷新页面查看</p>
      <div class="actions">
        <button class="action-btn primary" @click="refreshPage">刷新页面</button>
        <button class="action-btn secondary" @click="goHome">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vitepress';
import { getOrderDetail, syncOrderStatus } from '../../api/wallet';

const loading = ref(true);
const orderInfo = ref(null);

// 从URL获取参数
const getQueryParam = (name) => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};

const formatDate = (dateString) => {
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

const refreshPage = () => {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

onMounted(async () => {
  const orderNo = getQueryParam('order_no');
  
  if (!orderNo) {
    // 缺少参数，跳转到失败页面
    if (typeof window !== 'undefined') {
      window.location.href = '/pages/payment/failed?reason=invalid_params';
    }
    return;
  }

  try {
    // 查询订单详情
    const order = await getOrderDetail(orderNo);
    
    // 如果状态还是pending，主动触发同步
    if (order.status === 'pending') {
      console.log('Order is pending, syncing status...');
      try {
        await syncOrderStatus(order.id);
        // 重新查询
        const updatedOrder = await getOrderDetail(orderNo);
        orderInfo.value = updatedOrder;
      } catch (syncError) {
        console.error('Sync failed, using current order data:', syncError);
        orderInfo.value = order;
      }
    } else {
      orderInfo.value = order;
    }
  } catch (error) {
    console.error('Failed to fetch order details:', error);
    // 查询失败，跳转到失败页面
    if (typeof window !== 'undefined') {
      window.location.href = '/pages/payment/failed?reason=query_failed';
    }
  } finally {
    loading.value = false;
  }
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

  &.success {
    background: rgba(52, 199, 89, 0.15);
    color: #34C759;
  }

  &.pending {
    background: rgba(255, 149, 0, 0.15);
    color: #FF9500;
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
