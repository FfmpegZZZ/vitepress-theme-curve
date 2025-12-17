<template>
  <div class="console-container">
    <!-- 侧边栏导航 -->
    <aside class="console-sidebar">
      <div class="sidebar-header">
        <div class="user-avatar-large">
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor">
            <path d="M512 448c-35.296 0-64-28.704-64-64s28.704-64 64-64 64 28.704 64 64-28.704 64-64 64m0-192c-70.592 0-128 57.408-128 128s57.408 128 128 128 128-57.408 128-128-57.408-128-128-128"></path>
            <path d="M768 797.632v-69.92a151.904 151.904 0 0 0-151.712-151.68h-208.576A151.904 151.904 0 0 0 256 727.68v69.92C177.632 727.36 128 625.6 128 512 128 299.904 299.936 128 512 128s384 171.904 384 384c0 113.6-49.632 215.36-128 285.632m-448 46.56v-116.48a87.776 87.776 0 0 1 87.712-87.68h208.576A87.776 87.776 0 0 1 704 727.68v116.48a381.568 381.568 0 0 1-384 0m192-780.16C264.96 64 64 264.96 64 512c0 246.976 200.96 448 448 448s448-201.024 448-448c0-247.04-200.96-448-448-448"></path>
          </svg>
        </div>
        <div class="user-info-sidebar">
          <div class="user-name">{{ authStore.username }}</div>
          <div class="user-email">{{ authStore.email }}</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button 
          v-for="item in navItems" 
          :key="item.id"
          :class="['nav-item', { active: activeTab === item.id }]"
          @click="activeTab = item.id"
        >
          <svg class="nav-icon" v-html="item.icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"></svg>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <main class="console-main">
      <!-- 余额概览 -->
      <section v-if="activeTab === 'overview'" class="content-section">
        <h2 class="section-title">账户概览</h2>
        
        <div v-if="balanceLoading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="balanceError" class="error-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>{{ balanceError }}</p>
          <button class="retry-btn" @click="fetchBalance">重试</button>
        </div>

        <div v-else class="balance-cards">
          <div v-for="balance in balances" :key="balance.currency" class="balance-card">
            <div class="balance-header">
              <span class="currency-name">{{ getCurrencyName(balance.currency) }}</span>
              <span class="currency-tag">{{ balance.currency }}</span>
            </div>
            <div class="balance-amount">{{ balance.balance }}</div>
            <div v-if="parseFloat(balance.frozen) > 0" class="balance-frozen">
              冻结: {{ balance.frozen }}
            </div>
          </div>

          <button class="deposit-card" @click="activeTab = 'deposit'">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <span>充值</span>
          </button>
        </div>
      </section>

      <!-- 充值 -->
      <section v-if="activeTab === 'deposit'" class="content-section">
        <h2 class="section-title">充值</h2>
        
        <div class="deposit-form">
          <div class="form-group">
            <label>充值金额</label>
            <div class="amount-input-group">
              <span class="currency-symbol">¥</span>
              <input 
                v-model="depositAmount" 
                type="number" 
                placeholder="请输入充值金额"
                min="1"
                step="0.01"
                @input="validateDepositAmount"
              />
            </div>
            <span v-if="depositError" class="error-message">{{ depositError }}</span>
          </div>

          <div class="quick-amounts">
            <button 
              v-for="amount in [50, 100, 200, 500]" 
              :key="amount"
              class="quick-amount-btn"
              @click="depositAmount = amount"
            >
              ¥{{ amount }}
            </button>
          </div>

          <div class="form-group">
            <label>支付方式</label>
            <div class="payment-methods">
              <button 
                :class="['payment-method-btn', { active: paymentMethod === 'alipay' }]"
                @click="paymentMethod = 'alipay'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
                <span>支付宝</span>
              </button>
              <button 
                :class="['payment-method-btn', { active: paymentMethod === 'wechat' }]"
                @click="paymentMethod = 'wechat'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.5 9.5c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.3.8-.8.8zM15.5 9.5c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.3.8-.8.8z"/>
                  <path d="M12 2C6.5 2 2 6 2 11c0 1.7.5 3.3 1.3 4.7l-1.2 3.7 4-1.6c1.3.6 2.7 1 4.2 1 5.5 0 10-4 10-9s-4.5-9-10-9z"/>
                </svg>
                <span>微信支付</span>
              </button>
            </div>
          </div>

          <button 
            class="submit-btn" 
            :disabled="!canDeposit || depositLoading"
            @click="handleDeposit"
          >
            <span v-if="!depositLoading">确认充值</span>
            <span v-else class="loading-spinner">
              <div class="spinner"></div>
              处理中...
            </span>
          </button>
        </div>
      </section>

      <!-- 交易记录 -->
      <section v-if="activeTab === 'transactions'" class="content-section">
        <h2 class="section-title">交易记录</h2>

        <div v-if="transactionsLoading && transactions.length === 0" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="transactions.length === 0" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
          </svg>
          <p>暂无交易记录</p>
        </div>

        <div v-else class="transactions-list">
          <div v-for="tx in transactions" :key="tx.id" class="transaction-item">
            <div class="transaction-icon" :class="getTransactionTypeClass(tx.type)">
              {{ getTransactionIcon(tx.type) }}
            </div>
            <div class="transaction-info">
              <div class="transaction-desc">{{ tx.description }}</div>
              <div class="transaction-time">{{ formatDate(tx.created_at) }}</div>
            </div>
            <div :class="['transaction-amount', { negative: parseFloat(tx.amount) < 0 }]">
              {{ tx.amount }}
            </div>
          </div>

          <button 
            v-if="hasMoreTransactions" 
            class="load-more-btn"
            :disabled="transactionsLoading"
            @click="loadMoreTransactions"
          >
            {{ transactionsLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </section>

      <!-- 订单记录 -->
      <section v-if="activeTab === 'orders'" class="content-section">
        <h2 class="section-title">订单记录</h2>

        <div v-if="ordersLoading && orders.length === 0" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="orders.length === 0" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
          </svg>
          <p>暂无订单记录</p>
        </div>

        <div v-else class="orders-list">
          <div v-for="order in orders" :key="order.id" class="order-item">
            <div class="order-header">
              <span class="order-no">{{ order.order_no }}</span>
              <span :class="['order-status', getOrderStatusClass(order.status)]">
                {{ getOrderStatusText(order.status) }}
              </span>
            </div>
            <div class="order-details">
              <div class="order-detail-row">
                <span>金额</span>
                <span class="order-amount">¥{{ order.amount }}</span>
              </div>
              <div class="order-detail-row">
                <span>支付方式</span>
                <span>{{ getPaymentMethodText(order.payment_method) }}</span>
              </div>
              <div class="order-detail-row">
                <span>创建时间</span>
                <span>{{ formatDate(order.created_at) }}</span>
              </div>
            </div>
            <div v-if="order.status === 'pending'" class="order-actions">
              <button class="action-btn primary" @click="continuePayment(order)">继续支付</button>
              <button class="action-btn secondary" @click="cancelOrderConfirm(order.id)">取消订单</button>
            </div>
          </div>

          <button 
            v-if="hasMoreOrders" 
            class="load-more-btn"
            :disabled="ordersLoading"
            @click="loadMoreOrders"
          >
            {{ ordersLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </section>

      <!-- 账户设置 -->
      <section v-if="activeTab === 'settings'" class="content-section">
        <h2 class="section-title">账户设置</h2>

        <div class="settings-form">
          <div class="form-group">
            <label>用户名</label>
            <input 
              v-model="newUsername" 
              type="text" 
              :placeholder="authStore.username"
              @input="validateUsername"
            />
            <span v-if="usernameError" class="error-message">{{ usernameError }}</span>
            <span v-if="newUsername && newUsername !== authStore.username" class="info-message">
              修改用户名后需要重新登录
            </span>
          </div>

          <button 
            class="submit-btn" 
            :disabled="!canUpdateUsername || settingsLoading"
            @click="updateUsername"
          >
            <span v-if="!settingsLoading">保存更改</span>
            <span v-else class="loading-spinner">
              <div class="spinner"></div>
              保存中...
            </span>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../store';
import { getWalletBalance, getTransactions, createDepositOrder, getPaymentOrders, cancelOrder } from '../../api/wallet';

const authStore = useAuthStore();

// 导航项
const navItems = [
  { id: 'overview', label: '账户概览', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>' },
  { id: 'deposit', label: '充值', icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>' },
  { id: 'transactions', label: '交易记录', icon: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>' },
  { id: 'orders', label: '订单记录', icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>' },
  { id: 'settings', label: '账户设置', icon: '<circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path>' },
];

// 当前标签
const activeTab = ref('overview');

// ========== 余额相关 ==========
const balances = ref([]);
const balanceLoading = ref(false);
const balanceError = ref('');

const fetchBalance = async () => {
  balanceLoading.value = true;
  balanceError.value = '';
  try {
    const data = await getWalletBalance();
    balances.value = data.balances || [];
  } catch (error) {
    balanceError.value = error.message || '获取余额失败';
  } finally {
    balanceLoading.value = false;
  }
};

const getCurrencyName = (currency) => {
  const names = {
    'GOLD': '金币',
    'CRYSTAL': '水晶',
  };
  return names[currency] || currency;
};

// ========== 充值相关 ==========
const depositAmount = ref('');
const paymentMethod = ref('alipay');
const depositError = ref('');
const depositLoading = ref(false);

const validateDepositAmount = () => {
  const amount = parseFloat(depositAmount.value);
  if (!depositAmount.value) {
    depositError.value = '';
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    depositError.value = '请输入有效的金额';
    return;
  }
  if (amount < 1) {
    depositError.value = '充值金额不能小于1元';
    return;
  }
  depositError.value = '';
};

const canDeposit = computed(() => {
  const amount = parseFloat(depositAmount.value);
  return amount >= 1 && !depositError.value && paymentMethod.value;
});

const handleDeposit = async () => {
  if (!canDeposit.value) return;

  depositLoading.value = true;
  try {
    const idempotencyKey = crypto.randomUUID();
    const result = await createDepositOrder({
      amount: depositAmount.value,
      payment_method: paymentMethod.value,
    }, idempotencyKey);

    // 跳转到支付页面
    if (result.payment_url) {
      window.location.href = result.payment_url;
    }
  } catch (error) {
    if (typeof $message !== 'undefined') {
      $message.error(error.message || '创建订单失败');
    }
  } finally {
    depositLoading.value = false;
  }
};

// ========== 交易记录相关 ==========
const transactions = ref([]);
const transactionsLoading = ref(false);
const transactionsPage = ref(1);
const hasMoreTransactions = ref(false);

const fetchTransactions = async () => {
  transactionsLoading.value = true;
  try {
    const result = await getTransactions({ page: transactionsPage.value, limit: 20 });
    transactions.value = result.data.transactions || [];
    const total = result.meta?.pagination?.total || 0;
    hasMoreTransactions.value = transactions.value.length < total;
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
  } finally {
    transactionsLoading.value = false;
  }
};

const loadMoreTransactions = async () => {
  transactionsPage.value++;
  transactionsLoading.value = true;
  try {
    const result = await getTransactions({ page: transactionsPage.value, limit: 20 });
    transactions.value.push(...(result.data.transactions || []));
    const total = result.meta?.pagination?.total || 0;
    hasMoreTransactions.value = transactions.value.length < total;
  } catch (error) {
    console.error('Failed to load more transactions:', error);
  } finally {
    transactionsLoading.value = false;
  }
};

const getTransactionIcon = (type) => {
  const icons = {
    'DEPOSIT': '💰',
    'GAME_PURCHASE': '🎮',
    'REFUND': '↩️',
    'REWARD': '🎁',
    'ADMIN_GRANT': '👑',
  };
  return icons[type] || '📝';
};

const getTransactionTypeClass = (type) => {
  const classes = {
    'DEPOSIT': 'deposit',
    'GAME_PURCHASE': 'purchase',
    'REFUND': 'refund',
    'REWARD': 'reward',
    'ADMIN_GRANT': 'admin',
  };
  return classes[type] || '';
};

// ========== 订单相关 ==========
const orders = ref([]);
const ordersLoading = ref(false);
const ordersPage = ref(1);
const hasMoreOrders = ref(false);

const fetchOrders = async () => {
  ordersLoading.value = true;
  try {
    const result = await getPaymentOrders({ page: ordersPage.value, limit: 20 });
    orders.value = result.data.orders || [];
    const total = result.meta?.pagination?.total || 0;
    hasMoreOrders.value = orders.value.length < total;
  } catch (error) {
    console.error('Failed to fetch orders:', error);
  } finally {
    ordersLoading.value = false;
  }
};

const loadMoreOrders = async () => {
  ordersPage.value++;
  ordersLoading.value = true;
  try {
    const result = await getPaymentOrders({ page: ordersPage.value, limit: 20 });
    orders.value.push(...(result.data.orders || []));
    const total = result.meta?.pagination?.total || 0;
    hasMoreOrders.value = orders.value.length < total;
  } catch (error) {
    console.error('Failed to load more orders:', error);
  } finally {
    ordersLoading.value = false;
  }
};

const getOrderStatusText = (status) => {
  const texts = {
    'pending': '待支付',
    'paid': '已支付',
    'cancelled': '已取消',
    'expired': '已过期',
    'refunded': '已退款',
  };
  return texts[status] || status;
};

const getOrderStatusClass = (status) => {
  return status;
};

const getPaymentMethodText = (method) => {
  const texts = {
    'alipay': '支付宝',
    'wechat': '微信支付',
  };
  return texts[method] || method;
};

const continuePayment = (order) => {
  if (order.payment_url) {
    window.location.href = order.payment_url;
  }
};

const cancelOrderConfirm = async (orderId) => {
  if (!confirm('确定要取消这个订单吗？')) return;
  
  try {
    await cancelOrder(orderId);
    if (typeof $message !== 'undefined') {
      $message.success('订单已取消');
    }
    await fetchOrders();
  } catch (error) {
    if (typeof $message !== 'undefined') {
      $message.error(error.message || '取消订单失败');
    }
  }
};

// ========== 账户设置相关 ==========
const newUsername = ref('');
const usernameError = ref('');
const settingsLoading = ref(false);

const validateUsername = () => {
  if (!newUsername.value) {
    usernameError.value = '';
    return;
  }
  if (newUsername.value.length < 3) {
    usernameError.value = '用户名至少需要3个字符';
    return;
  }
  if (newUsername.value.length > 20) {
    usernameError.value = '用户名最多20个字符';
    return;
  }
  usernameError.value = '';
};

const canUpdateUsername = computed(() => {
  return newUsername.value && 
         newUsername.value !== authStore.username && 
         !usernameError.value;
});

const updateUsername = async () => {
  if (!canUpdateUsername.value) return;

  settingsLoading.value = true;
  try {
    await authStore.updateUserInfo({ username: newUsername.value });
    if (typeof $message !== 'undefined') {
      $message.success('用户名更新成功');
    }
    newUsername.value = '';
  } catch (error) {
    if (typeof $message !== 'undefined') {
      $message.error(error.message || '更新失败');
    }
  } finally {
    settingsLoading.value = false;
  }
};

// ========== 工具函数 ==========
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

// ========== 初始化 ==========
onMounted(() => {
  fetchBalance();
  fetchTransactions();
  fetchOrders();
});
</script>

<style lang="scss" scoped>
@use '../../style/auth.scss';

.console-container {
  display: flex;
  min-height: calc(100vh - 180px);
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;

  @media (max-width: 968px) {
    flex-direction: column;
    padding: 1rem;
  }
}

// ========== 侧边栏 ==========
.console-sidebar {
  flex-shrink: 0;
  width: 260px;
  background: var(--auth-modal-bg);
  backdrop-filter: blur(25px) saturate(180%);
  border-radius: 20px;
  border: 1px solid var(--auth-modal-border);
  padding: 2rem 1.5rem;
  height: fit-content;
  position: sticky;
  top: 80px;

  @media (max-width: 968px) {
    width: 100%;
    position: static;
  }
}

.sidebar-header {
  text-align: center;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--auth-border-color);
  margin-bottom: 1.5rem;
}

.user-avatar-large {
  width: 72px;
  height: 72px;
  margin: 0 auto 1rem;
  background: var(--auth-blue);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-info-sidebar {
  .user-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--auth-text-primary);
    margin-bottom: 0.25rem;
  }

  .user-email {
    font-size: 13px;
    color: var(--auth-text-secondary);
    word-break: break-all;
  }
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: var(--auth-text-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    background: var(--auth-input-bg);
    color: var(--auth-text-primary);
  }

  &.active {
    background: var(--auth-blue);
    color: white;
  }
}

// ========== 主内容区 ==========
.console-main {
  flex: 1;
  min-width: 0;
}

.content-section {
  background: var(--auth-modal-bg);
  backdrop-filter: blur(25px) saturate(180%);
  border-radius: 20px;
  border: 1px solid var(--auth-modal-border);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--auth-text-primary);
  margin: 0 0 1.5rem 0;
  letter-spacing: -0.5px;
}

// ========== 余额卡片 ==========
.balance-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.balance-card {
  background: var(--auth-input-bg);
  border-radius: 16px;
  padding: 1.5rem;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
}

.balance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.currency-name {
  font-size: 14px;
  color: var(--auth-text-secondary);
  font-weight: 500;
}

.currency-tag {
  font-size: 11px;
  padding: 0.25rem 0.5rem;
  background: var(--auth-blue);
  color: white;
  border-radius: 6px;
  font-weight: 600;
}

.balance-amount {
  font-size: 28px;
  font-weight: 700;
  color: var(--auth-text-primary);
  margin-bottom: 0.5rem;
}

.balance-frozen {
  font-size: 13px;
  color: var(--auth-text-tertiary);
}

.deposit-card {
  background: var(--auth-blue);
  border: none;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--auth-blue-hover);
    transform: translateY(-2px);
  }
}

// ========== 充值表单 ==========
.deposit-form {
  max-width: 500px;
}

.form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--auth-text-secondary);
    margin-bottom: 0.5rem;
  }

  input {
    width: 100%;
    height: 44px;
    padding: 0 16px;
    background: var(--auth-input-bg);
    border: 1px solid var(--auth-input-border);
    border-radius: 10px;
    color: var(--auth-text-primary);
    font-size: 17px;
    transition: all 0.2s ease;
    outline: none;

    &::placeholder {
      color: var(--auth-text-tertiary);
    }

    &:focus {
      background: var(--auth-input-bg-focus);
      border-color: var(--auth-blue);
      box-shadow: 0 0 0 4px rgba(10, 132, 255, 0.15);
    }
  }

  .error-message {
    display: block;
    margin-top: 0.5rem;
    font-size: 13px;
    color: var(--auth-error-text);
  }

  .info-message {
    display: block;
    margin-top: 0.5rem;
    font-size: 13px;
    color: var(--auth-blue);
  }
}

.amount-input-group {
  position: relative;

  .currency-symbol {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 17px;
    color: var(--auth-text-secondary);
    pointer-events: none;
  }

  input {
    padding-left: 36px;
  }
}

.quick-amounts {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.quick-amount-btn {
  flex: 1;
  height: 36px;
  background: var(--auth-input-bg);
  border: 1px solid var(--auth-input-border);
  border-radius: 8px;
  color: var(--auth-text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--auth-input-bg-focus);
    border-color: var(--auth-blue);
  }
}

.payment-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.payment-method-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 48px;
  background: var(--auth-input-bg);
  border: 2px solid var(--auth-input-border);
  border-radius: 10px;
  color: var(--auth-text-primary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--auth-input-bg-focus);
  }

  &.active {
    border-color: var(--auth-blue);
    background: rgba(10, 132, 255, 0.1);
  }
}

.submit-btn {
  width: 100%;
  height: 48px;
  margin-top: 0.5rem;
  background: var(--auth-blue);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--auth-blue-hover);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    background: var(--auth-input-bg);
    color: var(--auth-text-tertiary);
    cursor: not-allowed;
  }

  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
}

// ========== 交易/订单列表 ==========
.transactions-list,
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--auth-input-bg);
  border-radius: 12px;
  transition: background 0.2s ease;

  &:hover {
    background: var(--auth-input-bg-focus);
  }
}

.transaction-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--auth-blue);
  color: white;

  &.deposit {
    background: #34C759;
  }

  &.purchase {
    background: #FF9500;
  }

  &.refund {
    background: #5AC8FA;
  }

  &.reward {
    background: #FF2D55;
  }
}

.transaction-info {
  flex: 1;
  min-width: 0;
}

.transaction-desc {
  font-size: 15px;
  font-weight: 500;
  color: var(--auth-text-primary);
  margin-bottom: 0.25rem;
}

.transaction-time {
  font-size: 13px;
  color: var(--auth-text-secondary);
}

.transaction-amount {
  font-size: 17px;
  font-weight: 600;
  color: #34C759;

  &.negative {
    color: var(--auth-error-text);
  }
}

.order-item {
  background: var(--auth-input-bg);
  border-radius: 12px;
  padding: 1.25rem;
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--auth-border-color);
}

.order-no {
  font-size: 14px;
  font-weight: 600;
  color: var(--auth-text-primary);
}

.order-status {
  font-size: 12px;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-weight: 600;

  &.pending {
    background: rgba(255, 149, 0, 0.15);
    color: #FF9500;
  }

  &.paid {
    background: rgba(52, 199, 89, 0.15);
    color: #34C759;
  }

  &.cancelled,
  &.expired {
    background: rgba(142, 142, 147, 0.15);
    color: #8E8E93;
  }

  &.refunded {
    background: rgba(255, 59, 48, 0.15);
    color: #FF3B30;
  }
}

.order-details {
  margin-bottom: 1rem;
}

.order-detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 14px;

  span:first-child {
    color: var(--auth-text-secondary);
  }

  span:last-child {
    color: var(--auth-text-primary);
    font-weight: 500;
  }
}

.order-amount {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: var(--auth-blue) !important;
}

.order-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--auth-border-color);
}

.action-btn {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &.primary {
    background: var(--auth-blue);
    color: white;

    &:hover {
      background: var(--auth-blue-hover);
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

.load-more-btn {
  width: 100%;
  height: 44px;
  margin-top: 0.5rem;
  background: var(--auth-input-bg);
  border: 1px solid var(--auth-input-border);
  border-radius: 10px;
  color: var(--auth-text-primary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--auth-input-bg-focus);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ========== 空状态/加载/错误 ==========
.loading-state,
.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;

  svg {
    margin-bottom: 1rem;
    color: var(--auth-text-tertiary);
  }

  p {
    font-size: 15px;
    color: var(--auth-text-secondary);
    margin: 0;
  }
}

.retry-btn {
  margin-top: 1rem;
  height: 36px;
  padding: 0 1.5rem;
  background: var(--auth-blue);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--auth-blue-hover);
  }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--auth-input-border);
  border-top-color: var(--auth-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// ========== 设置表单 ==========
.settings-form {
  max-width: 500px;
}
</style>
