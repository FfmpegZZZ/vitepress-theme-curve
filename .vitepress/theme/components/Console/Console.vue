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
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path d="M1024.0512 701.0304V196.864A196.9664 196.9664 0 0 0 827.136 0H196.864A196.9664 196.9664 0 0 0 0 196.864v630.272A196.9152 196.9152 0 0 0 196.864 1024h630.272a197.12 197.12 0 0 0 193.8432-162.0992c-52.224-22.6304-278.528-120.32-396.4416-176.64-89.7024 108.6976-183.7056 173.9264-325.3248 173.9264s-236.1856-87.2448-224.8192-194.048c7.4752-70.0416 55.552-184.576 264.2944-164.9664 110.08 10.3424 160.4096 30.8736 250.1632 60.5184 23.1936-42.5984 42.496-89.4464 57.1392-139.264H248.064v-39.424h196.9152V311.1424H204.8V267.776h240.128V165.632s2.1504-15.9744 19.8144-15.9744h98.4576V267.776h256v43.4176h-256V381.952h208.8448a805.9904 805.9904 0 0 1-84.8384 212.6848c60.672 22.016 336.7936 106.3936 336.7936 106.3936zM283.5456 791.6032c-149.6576 0-173.312-94.464-165.376-133.9392 7.8336-39.3216 51.2-90.624 134.4-90.624 95.5904 0 181.248 24.4736 284.0576 74.5472-72.192 94.0032-160.9216 150.016-253.0816 150.016z" fill="#009FE8"/>
                </svg>
                <span>支付宝</span>
              </button>
              <button 
                :class="['payment-method-btn', { active: paymentMethod === 'wechat' }]"
                @click="paymentMethod = 'wechat'"
              >
                <svg viewBox="0 0 1228 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path d="M530.8928 703.1296a41.472 41.472 0 0 1-35.7376-19.8144l-2.7136-5.5808L278.272 394.752a18.7392 18.7392 0 0 1-2.048-8.1408 19.968 19.968 0 0 1 20.48-19.3536c4.608 0 8.8576 1.4336 12.288 3.84l234.3936 139.9296a64.4096 64.4096 0 0 0 54.528 5.9392L1116.2624 204.8C1004.9536 80.896 821.76 0 614.4 0 275.0464 0 0 216.576 0 483.6352c0 145.7152 82.7392 276.8896 212.2752 365.5168a38.1952 38.1952 0 0 1 17.2032 31.488 44.4928 44.4928 0 0 1-2.1504 12.3904l-27.6992 97.4848c-1.3312 4.608-3.328 9.3696-3.328 14.1312 0 10.752 9.216 19.3536 20.48 19.3536 4.4032 0 8.0384-1.536 11.776-3.584l134.5536-73.3184c10.1376-5.5296 20.7872-8.96 32.6144-8.96 6.2976 0 12.288 0.9216 18.0736 2.5088 62.72 17.0496 130.4576 26.5728 200.5504 26.5728C953.7024 967.168 1228.8 750.592 1228.8 483.6352c0-80.9472-25.4464-157.1328-70.0416-224.1024l-604.9792 436.992-4.4544 2.4064a42.1376 42.1376 0 0 1-18.432 4.1984z" fill="#15BA11"/>
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
          <!-- 用户名修改 -->
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
            <span v-if="!settingsLoading">保存用户名</span>
            <span v-else class="loading-spinner">
              <div class="spinner"></div>
              保存中...
            </span>
          </button>

          <div class="divider"></div>

          <!-- 邮箱修改 -->
          <div class="form-group">
            <label>当前邮箱</label>
            <input 
              type="text" 
              :value="authStore.email"
              disabled
              class="disabled-input"
            />
          </div>

          <div class="form-group">
            <label>新邮箱</label>
            <input 
              v-model="newEmail" 
              type="email" 
              placeholder="请输入新邮箱地址"
              :disabled="emailLoading"
              @input="validateEmail"
            />
            <span v-if="emailError" class="error-message">{{ emailError }}</span>
          </div>

          <div class="form-group">
            <label>验证码</label>
            <div class="code-input-group">
              <input 
                v-model="emailCode" 
                type="text" 
                placeholder="请输入验证码"
                maxlength="6"
                :disabled="emailLoading"
              />
              <button 
                class="send-code-btn"
                :disabled="!canSendEmailCode || emailCodeCountdown > 0 || emailLoading"
                @click="sendEmailVerificationCode"
              >
                {{ emailCodeCountdown > 0 ? `${emailCodeCountdown}秒后重试` : '发送验证码' }}
              </button>
            </div>
            <span v-if="emailCodeSent" class="success-message">验证码已发送到 {{ newEmail }}</span>
          </div>

          <button 
            class="submit-btn" 
            :disabled="!canChangeEmail || emailLoading"
            @click="handleChangeEmail"
          >
            <span v-if="!emailLoading">修改邮箱</span>
            <span v-else class="loading-spinner">
              <div class="spinner"></div>
              处理中...
            </span>
          </button>
        </div>
      </section>
    </main>
    
    <!-- 登录模态框 -->
    <AuthModal v-model:show="showAuthModal" @success="handleLoginSuccess" />

    <!-- 支付二维码弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showQRCodeModal" class="qrcode-modal-overlay" @click="closeQRCodeModal">
          <div class="qrcode-modal-content" @click.stop>
            <button class="qrcode-modal-close" @click="closeQRCodeModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h3 class="qrcode-modal-title">扫码支付</h3>

            <div class="qrcode-modal-info">
              <span class="qrcode-amount">¥{{ qrcodeData.amount }}</span>
              <span class="qrcode-method">{{ qrcodeData.paymentMethod === 'wechat' ? '微信支付' : '支付宝' }}</span>
            </div>

            <div class="qrcode-container" ref="qrcodeContainer">
              <canvas id="qrcode-canvas"></canvas>
            </div>

            <p class="qrcode-tip">请使用{{ qrcodeData.paymentMethod === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成支付</p>

            <div class="qrcode-order-no">订单号: {{ qrcodeData.orderNo }}</div>

            <div class="qrcode-modal-footer">
              <button class="qrcode-check-btn" @click="manualCheckStatus">刷新状态</button>
              <button class="qrcode-close-btn" @click="closeQRCodeModal">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { useAuthStore } from '../../store';
import { getWalletBalance, getTransactions, createDepositOrder, getPaymentOrders, cancelOrder, syncOrderStatus } from '../../api/wallet';
import { sendVerificationCode, changeEmail } from '../../api/auth';
import AuthModal from '../Auth/AuthModal.vue';
import QRCode from 'qrcode';

const authStore = useAuthStore();

// 登录模态框
const showAuthModal = ref(false);

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
  // 检查小数位数不超过2位
  const decimalPart = depositAmount.value.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    depositError.value = '金额最多只能有两位小数';
    return;
  }
  depositError.value = '';
};

const canDeposit = computed(() => {
  const amount = parseFloat(depositAmount.value);
  return amount >= 1 && !depositError.value && paymentMethod.value;
});

/**
 * 检测设备类型
 * @returns {'pc' | 'mobile'} 设备类型
 */
const getDeviceType = () => {
  const ua = navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) 
    ? 'mobile' 
    : 'pc';
};

// 支付二维码弹窗状态
const showQRCodeModal = ref(false);
const qrcodeData = ref({
  codeUrl: '',
  orderNo: '',
  amount: '',
  paymentMethod: ''
});

// 轮询订单状态
let qrcodeCheckTimer = null;

const handleDeposit = async () => {
  if (!canDeposit.value) return;

  depositLoading.value = true;
  try {
    const idempotencyKey = crypto.randomUUID();
    // 格式化金额为保留两位小数的字符串
    const formattedAmount = parseFloat(depositAmount.value).toFixed(2);

    const result = await createDepositOrder({
      amount: formattedAmount,
      payment_method: paymentMethod.value,
      device: getDeviceType(), // 自动检测设备类型，支持 PC 和手机端支付
    }, idempotencyKey);

    // 根据 payment_type 处理
    if (result.payment_type === 'qrcode') {
      // 显示二维码扫码支付
      qrcodeData.value = {
        codeUrl: result.payment_url,
        orderNo: result.order_no,
        amount: formattedAmount,
        paymentMethod: paymentMethod.value
      };
      showQRCodeModal.value = true;
      // 开始轮询订单状态
      startQrcodeCheck();
    } else if (result.payment_url) {
      // 跳转到支付页面
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

// 开始轮询检查二维码支付状态
const startQrcodeCheck = () => {
  if (qrcodeCheckTimer) {
    clearInterval(qrcodeCheckTimer);
  }

  let checkCount = 0;
  const maxChecks = 60; // 最多检查 60 次（2 分钟）

  qrcodeCheckTimer = setInterval(async () => {
    checkCount++;
    if (checkCount > maxChecks) {
      stopQrcodeCheck();
      return;
    }

    try {
      const result = await syncOrderStatus(qrcodeData.value.orderNo);
      const status = result.data?.status;
      if (status === 'paid') {
        stopQrcodeCheck();
        showQRCodeModal.value = false;
        if (typeof $message !== 'undefined') {
          $message.success('支付成功！');
        }
        // 刷新余额和订单
        fetchBalance();
        fetchOrders();
        depositAmount.value = '';
      } else if (status === 'cancelled' || status === 'expired') {
        stopQrcodeCheck();
        showQRCodeModal.value = false;
        if (typeof $message !== 'undefined') {
          $message.warning('订单已关闭或已过期');
        }
      }
    } catch (error) {
      console.error('检查支付状态失败:', error);
    }
  }, 2000); // 每 2 秒检查一次
};

// 停止轮询
const stopQrcodeCheck = () => {
  if (qrcodeCheckTimer) {
    clearInterval(qrcodeCheckTimer);
    qrcodeCheckTimer = null;
  }
};

// 关闭二维码弹窗
const closeQRCodeModal = () => {
  stopQrcodeCheck();
  showQRCodeModal.value = false;
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
  if (!order.payment_url) return;

  // 微信 Native 支付的 code_url 以 weixin:// 开头，需要展示二维码
  if (order.payment_url.startsWith('weixin://')) {
    qrcodeData.value = {
      codeUrl: order.payment_url,
      orderNo: order.order_no,
      amount: order.amount,
      paymentMethod: order.payment_method || 'wechat'
    };
    showQRCodeModal.value = true;
    startQrcodeCheck();
  } else {
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

// 邮箱修改相关
const newEmail = ref('');
const emailCode = ref('');
const emailError = ref('');
const emailLoading = ref(false);
const emailCodeSent = ref(false);
const emailCodeCountdown = ref(0);

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!newEmail.value) {
    emailError.value = '';
    return;
  }
  if (!emailRegex.test(newEmail.value)) {
    emailError.value = '请输入有效的邮箱地址';
    return;
  }
  if (newEmail.value === authStore.email) {
    emailError.value = '新邮箱与当前邮箱相同';
    return;
  }
  emailError.value = '';
};

const canSendEmailCode = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(newEmail.value) && newEmail.value !== authStore.email && !emailError.value;
});

const canChangeEmail = computed(() => {
  return canSendEmailCode.value && emailCode.value.length === 6;
});

const sendEmailVerificationCode = async () => {
  if (!canSendEmailCode.value) return;

  emailLoading.value = true;
  try {
    await sendVerificationCode({
      email: newEmail.value,
      type: 'change_email',
      turnstile_token: '', // 如果需要turnstile验证，需要添加
    });
    
    emailCodeSent.value = true;
    emailCodeCountdown.value = 60;
    
    // 倒计时
    const timer = setInterval(() => {
      emailCodeCountdown.value--;
      if (emailCodeCountdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    
    if (typeof $message !== 'undefined') {
      $message.success('验证码已发送');
    }
  } catch (error) {
    if (typeof $message !== 'undefined') {
      $message.error(error.message || '发送验证码失败');
    }
  } finally {
    emailLoading.value = false;
  }
};

const handleChangeEmail = async () => {
  if (!canChangeEmail.value) return;

  emailLoading.value = true;
  try {
    await changeEmail({
      new_email: newEmail.value,
      email_code: emailCode.value,
    });

    if (typeof $message !== 'undefined') {
      $message.success('邮箱修改成功');
    }

    // 清空表单
    newEmail.value = '';
    emailCode.value = '';
    emailCodeSent.value = false;

    // 重新获取用户信息
    await authStore.fetchUser();
  } catch (error) {
    if (typeof $message !== 'undefined') {
      $message.error(error.message || '修改邮箱失败');
    }
  } finally {
    emailLoading.value = false;
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
  // 检查用户是否已登录
  if (!authStore.isAuthenticated) {
    // 未登录，显示登录模态框
    showAuthModal.value = true;
    return;
  }
  
  // 已登录，加载数据
  fetchBalance();
  fetchTransactions();
  fetchOrders();
});

// 组件卸载时清理定时器
onUnmounted(() => {
  stopQrcodeCheck();
});

// 监听二维码弹窗显示状态，生成二维码
watch(showQRCodeModal, async (isVisible) => {
  if (isVisible && qrcodeData.value.codeUrl) {
    await nextTick();
    generateQRCode(qrcodeData.value.codeUrl);
  }
});

// 生成二维码
const generateQRCode = async (text) => {
  const canvas = document.getElementById('qrcode-canvas');
  if (!canvas) return;

  try {
    await QRCode.toCanvas(canvas, text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('生成二维码失败:', error);
  }
};

// 手动刷新状态
const manualCheckStatus = async () => {
  try {
    const result = await syncOrderStatus(qrcodeData.value.orderNo);
    if (result.status === 'PAID') {
      stopQrcodeCheck();
      showQRCodeModal.value = false;
      if (typeof $message !== 'undefined') {
        $message.success('支付成功！');
      }
      fetchBalance();
      fetchOrders();
      depositAmount.value = '';
    } else if (result.status === 'PENDING') {
      if (typeof $message !== 'undefined') {
        $message.info('订单待支付中...');
      }
    } else {
      stopQrcodeCheck();
      showQRCodeModal.value = false;
      if (typeof $message !== 'undefined') {
        $message.warning('订单状态: ' + result.status);
      }
    }
  } catch (error) {
    if (typeof $message !== 'undefined') {
      $message.error(error.message || '查询订单状态失败');
    }
  }
};

// 登录成功处理
const handleLoginSuccess = () => {
  showAuthModal.value = false;
  // 重新加载页面数据
  fetchBalance();
  fetchTransactions();
  fetchOrders();
};
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
    padding: 1.25rem;
    border-radius: 16px;
  }
}

.sidebar-header {
  text-align: center;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--auth-border-color);
  margin-bottom: 1.5rem;

  @media (max-width: 968px) {
    display: flex;
    align-items: center;
    text-align: left;
    padding-bottom: 1.25rem;
    margin-bottom: 1.25rem;
    gap: 1rem;
  }
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
  flex-shrink: 0;

  @media (max-width: 968px) {
    width: 56px;
    height: 56px;
    margin: 0;

    svg {
      width: 36px;
      height: 36px;
    }
  }
}

.user-info-sidebar {
  @media (max-width: 968px) {
    flex: 1;
    min-width: 0;
  }

  .user-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--auth-text-primary);
    margin-bottom: 0.25rem;

    @media (max-width: 968px) {
      font-size: 16px;
    }
  }

  .user-email {
    font-size: 13px;
    color: var(--auth-text-secondary);
    word-break: break-all;

    @media (max-width: 968px) {
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media (max-width: 968px) {
    flex-direction: row;
    overflow-x: auto;
    margin: 0 -1.25rem;
    padding: 0 1.25rem;
    gap: 0.5rem;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
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
  white-space: nowrap;

  @media (max-width: 968px) {
    flex-shrink: 0;
    padding: 0.625rem 1rem;
    font-size: 14px;
    gap: 0.5rem;
    border-radius: 20px;
    background: var(--auth-input-bg);
  }

  svg {
    flex-shrink: 0;

    @media (max-width: 968px) {
      width: 18px;
      height: 18px;
    }
  }

  &:hover {
    background: var(--auth-input-bg);
    color: var(--auth-text-primary);

    @media (max-width: 968px) {
      background: var(--auth-input-bg-focus);
    }
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
    padding: 1.25rem;
    border-radius: 16px;
  }
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--auth-text-primary);
  margin: 0 0 1.5rem 0;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 20px;
    margin-bottom: 1.25rem;
  }
}

// ========== 余额卡片 ==========
.balance-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
}

.balance-card {
  background: var(--auth-input-bg);
  border-radius: 16px;
  padding: 1.5rem;
  transition: transform 0.2s ease;

  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 12px;
  }

  &:hover {
    transform: translateY(-2px);
  }
}

.balance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;

  @media (max-width: 480px) {
    margin-bottom: 0.75rem;
  }
}

.currency-name {
  font-size: 14px;
  color: var(--auth-text-secondary);
  font-weight: 500;

  @media (max-width: 480px) {
    font-size: 12px;
  }
}

.currency-tag {
  font-size: 11px;
  padding: 0.25rem 0.5rem;
  background: var(--auth-blue);
  color: white;
  border-radius: 6px;
  font-weight: 600;

  @media (max-width: 480px) {
    font-size: 10px;
    padding: 0.2rem 0.4rem;
  }
}

.balance-amount {
  font-size: 28px;
  font-weight: 700;
  color: var(--auth-text-primary);
  margin-bottom: 0.5rem;

  @media (max-width: 480px) {
    font-size: 22px;
  }
}

.balance-frozen {
  font-size: 13px;
  color: var(--auth-text-tertiary);

  @media (max-width: 480px) {
    font-size: 11px;
  }
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

  @media (max-width: 768px) {
    max-width: 100%;
  }
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

  @media (max-width: 480px) {
    flex-wrap: wrap;
  }
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
  min-width: 0;

  @media (max-width: 480px) {
    flex: 0 0 calc(50% - 0.25rem);
    height: 40px;
  }

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

  @media (max-width: 480px) {
    height: 44px;
    font-size: 14px;
  }

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

  @media (max-width: 480px) {
    gap: 0.75rem;
    padding: 0.875rem;
  }

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
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    font-size: 18px;
    border-radius: 8px;
  }

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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 480px) {
    font-size: 14px;
  }
}

.transaction-time {
  font-size: 13px;
  color: var(--auth-text-secondary);

  @media (max-width: 480px) {
    font-size: 12px;
  }
}

.transaction-amount {
  font-size: 17px;
  font-weight: 600;
  color: #34C759;
  flex-shrink: 0;

  @media (max-width: 480px) {
    font-size: 15px;
  }

  &.negative {
    color: var(--auth-error-text);
  }
}

.order-item {
  background: var(--auth-input-bg);
  border-radius: 12px;
  padding: 1.25rem;

  @media (max-width: 480px) {
    padding: 1rem;
  }
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--auth-border-color);
  gap: 0.5rem;

  @media (max-width: 480px) {
    margin-bottom: 0.75rem;
    padding-bottom: 0.625rem;
  }
}

.order-no {
  font-size: 14px;
  font-weight: 600;
  color: var(--auth-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;

  @media (max-width: 480px) {
    font-size: 13px;
  }
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

  @media (max-width: 480px) {
    font-size: 13px;
  }

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

  @media (max-width: 480px) {
    height: 38px;
    font-size: 13px;
  }

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

  @media (max-width: 768px) {
    max-width: 100%;
  }

  .divider {
    height: 1px;
    background: var(--auth-border-color);
    margin: 2rem 0;

    @media (max-width: 768px) {
      margin: 1.5rem 0;
    }
  }

  .disabled-input {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .code-input-group {
    display: flex;
    gap: 0.5rem;

    @media (max-width: 480px) {
      flex-direction: column;
    }

    input {
      flex: 1;
    }

    .send-code-btn {
      flex-shrink: 0;
      height: 44px;
      padding: 0 16px;
      background: var(--auth-blue);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      @media (max-width: 480px) {
        width: 100%;
        height: 44px;
      }

      &:hover:not(:disabled) {
        background: var(--auth-blue-hover);
      }

      &:disabled {
        background: var(--auth-input-bg);
        color: var(--auth-text-tertiary);
        cursor: not-allowed;
      }

      &:active:not(:disabled) {
        transform: scale(0.98);
      }
    }
  }

  .success-message {
    display: block;
    margin-top: 0.5rem;
    font-size: 13px;
    color: #34C759;
    line-height: 1.4;
  }
}

// ========== 支付二维码弹窗 ==========
.qrcode-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.qrcode-modal-content {
  background: var(--auth-modal-bg);
  backdrop-filter: blur(25px) saturate(180%);
  border-radius: 20px;
  border: 1px solid var(--auth-modal-border);
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  position: relative;
  animation: modalSlideIn 0.3s ease;

  @media (max-width: 480px) {
    padding: 1.5rem;
    margin: 0 1rem;
  }
}

.qrcode-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--auth-text-secondary);
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: var(--auth-input-bg);
    color: var(--auth-text-primary);
  }
}

.qrcode-modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--auth-text-primary);
  margin: 0 0 1rem;
}

.qrcode-modal-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.qrcode-amount {
  font-size: 28px;
  font-weight: 700;
  color: var(--auth-blue);
}

.qrcode-method {
  font-size: 14px;
  padding: 4px 12px;
  background: var(--auth-input-bg);
  border-radius: 12px;
  color: var(--auth-text-secondary);
}

.qrcode-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: white;
  border-radius: 16px;
  margin: 0 auto 1rem;
  width: 220px;
  height: 220px;
}

#qrcode-canvas {
  max-width: 100%;
  height: auto;
}

.qrcode-tip {
  font-size: 14px;
  color: var(--auth-text-secondary);
  margin: 0 0 0.75rem;
  line-height: 1.5;
}

.qrcode-order-no {
  font-size: 12px;
  color: var(--auth-text-tertiary);
  margin-bottom: 1.5rem;
  word-break: break-all;
}

.qrcode-modal-footer {
  display: flex;
  gap: 1rem;

  @media (max-width: 480px) {
    flex-direction: column;
  }
}

.qrcode-check-btn,
.qrcode-close-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.qrcode-check-btn {
  background: var(--auth-blue);
  color: white;

  &:hover {
    background: var(--auth-blue-hover);
  }

  &:active {
    transform: scale(0.98);
  }
}

.qrcode-close-btn {
  background: var(--auth-input-bg);
  color: var(--auth-text-primary);

  &:hover {
    background: var(--auth-input-bg-focus);
  }

  &:active {
    transform: scale(0.98);
  }
}

// 模态框过渡动画
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .qrcode-modal-content,
.modal-leave-to .qrcode-modal-content {
  transform: scale(0.9) translateY(-20px);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
