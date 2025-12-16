<template>
  <div class="auth-form register-form">
    <h2 class="form-title">创建账户</h2>
    <p class="form-subtitle">加入我们的社区</p>

    <form @submit.prevent="handleSubmit">
      <!-- 用户名 -->
      <div class="form-group">
        <label for="username">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          用户名
        </label>
        <input
          id="username"
          v-model="formData.username"
          type="text"
          placeholder="3-32个字符"
          :disabled="loading"
          @blur="validateUsernameOnBlur"
        />
        <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
      </div>

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
            placeholder="至少8个字符"
            :disabled="loading"
            @blur="validatePasswordOnBlur"
          />
          <div class="toggle-password" @click="showPassword = !showPassword">
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          </div>
        </div>
        <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
      </div>

      <!-- 确认密码 -->
      <div class="form-group">
        <label for="confirmPassword">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          确认密码
        </label>
        <div class="password-input">
          <input
            id="confirmPassword"
            v-model="formData.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="再次输入密码"
            :disabled="loading"
            @blur="validateConfirmPasswordOnBlur"
          />
          <div class="toggle-password" @click="showConfirmPassword = !showConfirmPassword">
            <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          </div>
        </div>
        <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
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
        <span v-if="!loading">注册</span>
        <span v-else class="loading-spinner">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
          注册中...
        </span>
      </button>
    </form>

    <!-- 切换到登录 -->
    <div class="form-footer">
      <span>已有账户?</span>
      <a @click="$emit('switch-mode', 'login')">立即登录</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../../store';
import { sendVerificationCode } from '../../api/auth';
import TurnstileWidget from './TurnstileWidget.vue';

const emit = defineEmits(['success', 'switch-mode']);

const authStore = useAuthStore();
const turnstileRef = ref(null);

// 表单数据
const formData = ref({
  username: '',
  email: '',
  verificationCode: '', // 新增验证码字段
  password: '',
  confirmPassword: '',
  turnstile_token: '',
});

// 表单验证错误
const errors = ref({
  username: '',
  email: '',
  verificationCode: '', // 新增验证码错误
  password: '',
  confirmPassword: '',
});

// 状态
const loading = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// 验证码相关状态
const codeSending = ref(false); // 是否正在发送验证码
const countdown = ref(0); // 倒计时秒数
const codeHint = ref(''); // 验证码提示信息
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

// 验证用户名

// 验证用户名（@blur 时调用，只验证格式）
const validateUsernameOnBlur = () => {
  if (!formData.value.username) {
    errors.value.username = '';
    return;
  }
  
  if (formData.value.username.length < 3 || formData.value.username.length > 32) {
    errors.value.username = '用户名长度应为3-32个字符';
  } else {
    errors.value.username = '';
  }
};

// 验证用户名（提交时调用，验证必填+格式）
const validateUsername = () => {
  if (!formData.value.username) {
    errors.value.username = '请输入用户名';
    return false;
  }
  if (formData.value.username.length < 3 || formData.value.username.length > 32) {
    errors.value.username = '用户名长度应为3-32个字符';
    return false;
  }
  errors.value.username = '';
  return true;
};

// 验证邮箱（@blur 时调用，只验证格式）
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

// 验证邮箱（提交时调用，验证必填+格式）
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
  
  codeSending.value = true;
  codeHint.value = '';
  errors.value.verificationCode = '';
  
  try {
    const result = await sendVerificationCode({
      email: formData.value.email,
      type: 'register'
    });
    
    // 开始倒计时
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
    
    if (error.code === 'ERR_TOO_FREQUENT' || error.code === 'ERR_429') {
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

// 验证码校验（@blur 时调用，只验证格式）
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

// 验证码校验（提交时调用，验证必填+格式）
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


// 验证密码（@blur 时调用，只验证格式）
const validatePasswordOnBlur = () => {
  if (!formData.value.password) {
    errors.value.password = '';
    return;
  }
  
  if (formData.value.password.length < 8) {
    errors.value.password = '密码至少需要8个字符';
  } else {
    errors.value.password = '';
    // 如果确认密码已填写，重新验证
    if (formData.value.confirmPassword) {
      validateConfirmPasswordOnBlur();
    }
  }
};

// 验证密码（提交时调用，验证必填+格式）
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
  
  // 如果确认密码已填写，重新验证
  if (formData.value.confirmPassword) {
    validateConfirmPassword();
  }
  
  return true;
};

// 验证确认密码（@blur 时调用，只验证格式）
const validateConfirmPasswordOnBlur = () => {
  if (!formData.value.confirmPassword) {
    errors.value.confirmPassword = '';
    return;
  }
  
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = '两次输入的密码不一致';
  } else {
    errors.value.confirmPassword = '';
  }
};

// 验证确认密码（提交时调用，验证必填+格式）
const validateConfirmPassword = () => {
  if (!formData.value.confirmPassword) {
    errors.value.confirmPassword = '请再次输入密码';
    return false;
  }
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = '两次输入的密码不一致';
    return false;
  }
  errors.value.confirmPassword = '';
  return true;
};


// 是否可以提交
const canSubmit = computed(() => {
  return (
    formData.value.username &&
    formData.value.email &&
    formData.value.verificationCode &&
    formData.value.password &&
    formData.value.confirmPassword &&
    formData.value.turnstile_token &&
    !errors.value.username &&
    !errors.value.email &&
    !errors.value.verificationCode &&
    !errors.value.password &&
    !errors.value.confirmPassword
  );
});

// 处理 Turnstile 错误
const handleTurnstileError = () => {
  errorMessage.value = '人机验证失败，请重试';
};

// 提交表单
const handleSubmit = async () => {
  // 验证表单
  const usernameValid = validateUsername();
  const emailValid = validateEmail();
  const codeValid = validateCode(); // 新增：验证验证码
  const passwordValid = validatePassword();
  const confirmPasswordValid = validateConfirmPassword();

  if (!usernameValid || !emailValid || !codeValid || !passwordValid || !confirmPasswordValid) {
    return;
  }

  if (!formData.value.turnstile_token) {
    errorMessage.value = '请完成人机验证';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.register({
      username: formData.value.username,
      email: formData.value.email,
      password: formData.value.password,
      verification_code: formData.value.verificationCode, // 新增：包含验证码
      turnstile_token: formData.value.turnstile_token,
    });

    // 注册成功
    if (typeof $message !== 'undefined') {
      $message.success(`注册成功，欢迎 ${authStore.username}!`);
    }
    emit('success');
  } catch (error) {
    console.error('Register error:', error);
    
    // 显示错误消息
    if (error.code === 'ERR_CONFLICT' || error.code === 'ERR_409') {
      errorMessage.value = '用户名或邮箱已被使用';
    } else if (error.code === 'ERR_INVALID_CODE') {
      errorMessage.value = '验证码错误';
      errors.value.verificationCode = '验证码错误，请重新输入';
    } else if (error.code === 'ERR_CODE_EXPIRED') {
      errorMessage.value = '验证码已过期，请重新获取';
      errors.value.verificationCode = '验证码已过期';
    } else if (error.code === 'ERR_CODE_USED') {
      errorMessage.value = '验证码已使用，请重新获取';
      errors.value.verificationCode = '验证码已使用';
    } else if (error.code === 'ERR_VALIDATION' || error.code === 'ERR_400') {
      errorMessage.value = error.message || '输入信息有误，请检查';
    } else if (error.code === 'ERR_TURNSTILE') {
      errorMessage.value = '人机验证失败，请重试';
      turnstileRef.value?.reset();
    } else {
      errorMessage.value = error.message || '注册失败，请稍后重试';
    }
  } finally {
    loading.value = false;
  }
};

// 监听表单变化，清除错误
watch(() => formData.value.username, () => {
  if (errors.value.username) errors.value.username = '';
  if (errorMessage.value) errorMessage.value = '';
});

watch(() => formData.value.email, () => {
  if (errors.value.email) errors.value.email = '';
  if (errorMessage.value) errorMessage.value = '';
});

watch(() => formData.value.password, () => {
  if (errors.value.password) errors.value.password = '';
  if (errorMessage.value) errorMessage.value = '';
});

watch(() => formData.value.confirmPassword, () => {
  if (errors.value.confirmPassword) errors.value.confirmPassword = '';
  if (errorMessage.value) errorMessage.value = '';
});
</script>

<style lang="scss" scoped>
@use '../../style/auth.scss';
</style>
