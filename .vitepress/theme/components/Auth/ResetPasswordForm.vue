<template>
  <div class="auth-form reset-password-form">
    <h2 class="form-title">重置密码</h2>
    <p class="form-subtitle">通过邮箱验证码重置您的密码</p>

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
          placeholder="请输入注册邮箱"
          :disabled="loading"
          @blur="validateEmailOnBlur"
        />
        <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
      </div>

      <!-- 邮箱验证码 -->
      <div class="form-group">
        <label for="verificationCode">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          验证码
        </label>
        <div class="code-input-group">
          <input
            id="verificationCode"
            v-model="formData.verificationCode"
            type="text"
            placeholder="请输入6位验证码"
            maxlength="6"
            :disabled="loading"
            @blur="validateCodeOnBlur"
          />
          <button
            type="button"
            class="send-code-btn"
            :disabled="!canSendCode || codeSending || countdown > 0"
            @click="sendCode"
          >
            <span v-if="codeSending">发送中...</span>
            <span v-else-if="countdown > 0">{{ countdown }}s 后重试</span>
            <span v-else>发送验证码</span>
          </button>
        </div>
        <span v-if="errors.verificationCode" class="error-message">{{ errors.verificationCode }}</span>
        <span v-if="codeHint" class="info-message">{{ codeHint }}</span>
      </div>

      <!-- 新密码 -->
      <div class="form-group">
        <label for="newPassword">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          新密码
        </label>
        <div class="password-input">
          <input
            id="newPassword"
            v-model="formData.newPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="至少8个字符"
            :disabled="loading"
            @blur="validatePasswordOnBlur"
          />
          <div class="toggle-password" @click="showPassword = !showPassword">
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          </div>
        </div>
        <span v-if="errors.newPassword" class="error-message">{{ errors.newPassword }}</span>
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
      <button 
        type="submit" 
        class="submit-btn"
        :disabled="!canSubmit || loading"
      >
        <span v-if="loading" class="loading-spinner">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
          重置中...
        </span>
        <span v-else>重置密码</span>
      </button>
    </form>

    <!-- 底部链接 -->
    <div class="form-footer">
      想起密码了？
      <a @click="$emit('switch-mode', 'login')">立即登录</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { sendVerificationCode, resetPassword } from '../../api/auth';
import TurnstileWidget from './TurnstileWidget.vue';

const emit = defineEmits(['success', 'switch-mode']);

const turnstileRef = ref(null);

// 表单数据
const formData = ref({
  email: '',
  verificationCode: '',
  newPassword: '',
  turnstile_token: '',
});

// 表单验证错误
const errors = ref({
  email: '',
  verificationCode: '',
  newPassword: '',
});

// 状态
const loading = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);

// 验证码相关状态
const codeSending = ref(false);
const countdown = ref(0);
const codeHint = ref('');
let countdownTimer = null;

// 是否可以发送验证码
const canSendCode = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return formData.value.email && emailRegex.test(formData.value.email) && !errors.value.email;
});

// 当前主题
const currentTheme = computed(() => {
  if (typeof document !== 'undefined') {
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains('dark')) return 'dark';
    if (htmlElement.classList.contains('light')) return 'light';
  }
  return 'auto';
});

// 验证邮箱（@blur）
const validateEmailOnBlur = () => {
  if (!formData.value.email) {
    errors.value.email = '';
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.value.email)) {
    errors.value.email = '请输入有效的邮箱地址';
  } else {
    errors.value.email = '';
  }
};

// 验证邮箱（提交）
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

// 发送验证码
const sendCode = async () => {
  if (!canSendCode.value) return;
  
  if (!formData.value.turnstile_token) {
    errors.value.verificationCode = '请先完成人机验证';
    return;
  }
  
  codeSending.value = true;
  codeHint.value = '';
  errors.value.verificationCode = '';
  
  try {
    const result = await sendVerificationCode({
      email: formData.value.email,
      type: 'reset_password', // 注意类型
      turnstile_token: formData.value.turnstile_token
    });
    
    countdown.value = 60;
    codeHint.value = `验证码已发送至 ${formData.value.email}，${result.expires_in / 60} 分钟内有效`;
    
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 1000);
    
  } catch (error) {
    console.error('Send code error:', error);
    
    if (error.code === 'ERR_TURNSTILE') {
      errors.value.verificationCode = '人机验证失败，请重试';
      turnstileRef.value?.reset();
    } else if (error.code === 'ERR_TOO_FREQUENT' || error.code === 'ERR_429') {
      errors.value.verificationCode = '发送过于频繁，请稍后再试';
    } else if (error.code === 'ERR_TOO_MANY_REQUESTS') {
      errors.value.verificationCode = '今日发送次数已达上限，请明天再试';
    } else {
      errors.value.verificationCode = error.message || '发送验证码失败，请重试';
    }
  } finally {
    codeSending.value = false;
  }
};

// 验证码校验（@blur）
const validateCodeOnBlur = () => {
  if (!formData.value.verificationCode) {
    errors.value.verificationCode = '';
    return;
  }
  
  const codeRegex = /^\d{6}$/;
  if (!codeRegex.test(formData.value.verificationCode)) {
    errors.value.verificationCode = '验证码必须是6位数字';
  } else {
    errors.value.verificationCode = '';
  }
};

// 验证码校验（提交）
const validateCode = () => {
  if (!formData.value.verificationCode) {
    errors.value.verificationCode = '请输入验证码';
    return false;
  }
  
  const codeRegex = /^\d{6}$/;
  if (!codeRegex.test(formData.value.verificationCode)) {
    errors.value.verificationCode = '验证码必须是6位数字';
    return false;
  }
  
  errors.value.verificationCode = '';
  return true;
};

// 验证密码（@blur）
const validatePasswordOnBlur = () => {
  if (!formData.value.newPassword) {
    errors.value.newPassword = '';
    return;
  }
  
  if (formData.value.newPassword.length < 8) {
    errors.value.newPassword = '密码至少需要8个字符';
  } else {
    errors.value.newPassword = '';
  }
};

// 验证密码（提交）
const validatePassword = () => {
  if (!formData.value.newPassword) {
    errors.value.newPassword = '请输入新密码';
    return false;
  }
  if (formData.value.newPassword.length < 8) {
    errors.value.newPassword = '密码至少需要8个字符';
    return false;
  }
  errors.value.newPassword = '';
  return true;
};

// 是否可以提交
const canSubmit = computed(() => {
  return (
    formData.value.email &&
    formData.value.verificationCode &&
    formData.value.newPassword &&
    !errors.value.email &&
    !errors.value.verificationCode &&
    !errors.value.newPassword
  );
});

// 处理 Turnstile 错误
const handleTurnstileError = () => {
  errorMessage.value = '人机验证失败，请重试';
};

// 提交表单
const handleSubmit = async () => {
  const emailValid = validateEmail();
  const codeValid = validateCode();
  const passwordValid = validatePassword();

  if (!emailValid || !codeValid || !passwordValid) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    await resetPassword({
      email: formData.value.email,
      email_code: formData.value.verificationCode,
      new_password: formData.value.newPassword,
    });

    // 重置成功
    if (typeof $message !== 'undefined') {
      $message.success('密码重置成功，请使用新密码登录');
    }
    emit('success');
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.code === 'ERR_EMAIL_CODE_REQUIRED') {
      errorMessage.value = '请先获取邮箱验证码';
      errors.value.verificationCode = '请先获取验证码';
    } else if (error.code === 'ERR_EMAIL_CODE') {
      errorMessage.value = '验证码错误或已过期';
      errors.value.verificationCode = '验证码错误或已过期';
    } else if (error.code === 'ERR_USER_NOT_FOUND' || error.code === 'ERR_404') {
      errorMessage.value = '该邮箱未注册';
      errors.value.email = '该邮箱未注册';
    } else if (error.code === 'ERR_VALIDATION' || error.code === 'ERR_400') {
      errorMessage.value = error.message || '输入信息有误，请检查';
    } else {
      errorMessage.value = error.message || '密码重置失败，请稍后重试';
    }
  } finally {
    loading.value = false;
  }
};

// 监听表单变化，清除错误
watch(() => formData.value.email, () => {
  errors.value.email = '';
  errorMessage.value = '';
});

watch(() => formData.value.verificationCode, () => {
  errors.value.verificationCode = '';
  errorMessage.value = '';
});

watch(() => formData.value.newPassword, () => {
  errors.value.newPassword = '';
  errorMessage.value = '';
});
</script>

<style lang="scss" scoped>
/* 继承 auth.scss 的样式，无需额外样式 */
</style>
