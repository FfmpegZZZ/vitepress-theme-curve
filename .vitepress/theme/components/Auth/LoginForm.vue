<template>
  <div class="auth-form login-form">
    <h2 class="form-title">欢迎回来</h2>
    <p class="form-subtitle">登录您的账户</p>

    <form @submit.prevent="handleSubmit">
      <!-- 邮箱 -->
      <div class="form-group">
        <label for="email">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          邮箱
        </label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          placeholder="请输入邮箱地址"
          :disabled="loading"
          @blur="validateEmail"
        />
        <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
      </div>

      <!-- 密码 -->
      <div class="form-group">
        <label for="password">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          密码
        </label>
        <div class="password-input">
          <input
            id="password"
            v-model="formData.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            :disabled="loading"
            @blur="validatePassword"
          />
          <div class="toggle-password" @click="showPassword = !showPassword">
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          </div>
        </div>
        <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
      </div>

      <!-- Turnstile 验证 -->
      <TurnstileWidget 
        ref="turnstileRef"
        v-model="formData.turnstile_token" 
        :theme="currentTheme"
        @error="handleTurnstileError"
      />

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="form-error">
        <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        {{ errorMessage }}
      </div>

      <!-- 提交按钮 -->
      <button type="submit" class="submit-btn" :disabled="loading || !canSubmit">
        <span v-if="!loading">登录</span>
        <span v-else class="loading-spinner">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
          登录中...
        </span>
      </button>
    </form>

    <!-- 切换到注册 -->
    <div class="form-footer">
      <span>还没有账户?</span>
      <a @click="$emit('switch-mode', 'register')">立即注册</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../../store';
import TurnstileWidget from './TurnstileWidget.vue';

const emit = defineEmits(['success', 'switch-mode']);

const authStore = useAuthStore();
const turnstileRef = ref(null);

// 表单数据
const formData = ref({
  email: '',
  password: '',
  turnstile_token: '',
});

// 表单验证错误
const errors = ref({
  email: '',
  password: '',
});

// 状态
const loading = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);

// 当前主题
const currentTheme = computed(() => {
  if (typeof document !== 'undefined') {
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains('dark')) return 'dark';
    if (htmlElement.classList.contains('light')) return 'light';
  }
  return 'auto';
});

// 验证邮箱
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.value.email) {
    errors.value.email = '请输入邮箱地址';
    return false;
  }
  if (!emailRegex.test(formData.value.email)) {
    errors.value.email = '请输入有效的邮箱地址';
    return false;
  }
  errors.value.email = '';
  return true;
};

// 验证密码
const validatePassword = () => {
  if (!formData.value.password) {
    errors.value.password = '请输入密码';
    return false;
  }
  if (formData.value.password.length < 8) {
    errors.value.password = '密码至少需要8个字符';
    return false;
  }
  errors.value.password = '';
  return true;
};

// 是否可以提交
const canSubmit = computed(() => {
  return (
    formData.value.email &&
    formData.value.password &&
    formData.value.turnstile_token &&
    !errors.value.email &&
    !errors.value.password
  );
});

// 处理 Turnstile 错误
const handleTurnstileError = () => {
  errorMessage.value = '人机验证失败，请重试';
};

// 提交表单
const handleSubmit = async () => {
  // 验证表单
  const emailValid = validateEmail();
  const passwordValid = validatePassword();

  if (!emailValid || !passwordValid) {
    return;
  }

  if (!formData.value.turnstile_token) {
    errorMessage.value = '请完成人机验证';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.login({
      email: formData.value.email,
      password: formData.value.password,
      turnstile_token: formData.value.turnstile_token,
    });

    // 登录成功
    if (typeof $message !== 'undefined') {
      $message.success(`欢迎回来，${authStore.username}!`);
    }
    emit('success');
  } catch (error) {
    console.error('Login error:', error);
    
    // 显示错误消息
    if (error.code === 'ERR_UNAUTHORIZED') {
      errorMessage.value = '邮箱或密码错误';
    } else if (error.code === 'ERR_FORBIDDEN') {
      errorMessage.value = '账号已被封禁';
    } else if (error.code === 'ERR_TURNSTILE') {
      errorMessage.value = '人机验证失败，请重试';
      turnstileRef.value?.reset();
    } else {
      errorMessage.value = error.message || '登录失败，请稍后重试';
    }
  } finally {
    loading.value = false;
  }
};

// 监听表单变化，清除错误
watch(() => formData.value.email, () => {
  if (errors.value.email) errors.value.email = '';
  if (errorMessage.value) errorMessage.value = '';
});

watch(() => formData.value.password, () => {
  if (errors.value.password) errors.value.password = '';
  if (errorMessage.value) errorMessage.value = '';
});
</script>

<style lang="scss" scoped>
@use '../../style/auth.scss';
</style>
