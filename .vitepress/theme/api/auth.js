/**
 * 认证 API 模块
 */
import authConfig from '../config/auth.config';

const { apiBaseUrl } = authConfig;

/**
 * 获取存储的 access token
 */
const getAccessToken = () => {
    try {
        return localStorage.getItem('access_token');
    } catch (e) {
        return null;
    }
};

/**
 * 设置 access token
 */
const setAccessToken = (token) => {
    try {
        if (token) {
            localStorage.setItem('access_token', token);
        } else {
            localStorage.removeItem('access_token');
        }
    } catch (e) {
        console.error('Failed to set access token:', e);
    }
};

/**
 * 通用请求方法
 */
const request = async (endpoint, options = {}) => {
    const url = `${apiBaseUrl}${endpoint}`;
    const token = getAccessToken();

    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
    };

    // 添加认证头
    if (token && !options.skipAuth) {
        headers.Authorization = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
        credentials: 'include', // 携带 cookie (refresh_token)
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            // 处理错误响应
            const error = new Error(data.error?.message || 'Request failed');
            error.code = data.error?.code;
            error.status = response.status;
            error.details = data.error?.details;
            throw error;
        }

        return data;
    } catch (error) {
        // 网络错误或其他错误
        if (!error.status) {
            error.message = '网络连接失败，请检查您的网络';
        }
        throw error;
    }
};

/**
 * 用户注册
 * @param {Object} data - 注册数据
 * @param {string} data.username - 用户名
 * @param {string} data.email - 邮箱
 * @param {string} data.password - 密码
 * @param {string} data.turnstile_token - Turnstile 令牌
 */
export const register = async (data) => {
    const result = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        skipAuth: true,
    });

    // 保存 access token
    if (result.data?.access_token) {
        setAccessToken(result.data.access_token);
    }

    return result.data;
};

/**
 * 用户登录
 * @param {Object} data - 登录数据
 * @param {string} data.email - 邮箱
 * @param {string} data.password - 密码
 * @param {string} data.turnstile_token - Turnstile 令牌
 */
export const login = async (data) => {
    const result = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        skipAuth: true,
    });

    // 保存 access token
    if (result.data?.access_token) {
        setAccessToken(result.data.access_token);
    }

    return result.data;
};

/**
 * 刷新令牌
 */
export const refreshToken = async () => {
    const result = await request('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
    });

    // 更新 access token
    if (result.data?.access_token) {
        setAccessToken(result.data.access_token);
    }

    return result.data;
};

/**
 * 用户登出
 */
export const logout = async () => {
    try {
        await request('/auth/logout', {
            method: 'POST',
        });
    } finally {
        // 无论请求是否成功，都清除本地 token
        setAccessToken(null);
    }
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async () => {
    const result = await request('/me', {
        method: 'GET',
    });

    return result.data;
};

/**
 * 更新用户信息
 * @param {Object} data - 更新数据
 * @param {string} data.username - 新用户名
 */
export const updateUserInfo = async (data) => {
    const result = await request('/me', {
        method: 'PUT',
        body: JSON.stringify(data),
    });

    return result.data;
};

/**
 * 发送邮箱验证码
 * @param {Object} data - 验证码发送数据
 * @param {string} data.email - 接收验证码的邮箱
 * @param {string} [data.type='register'] - 验证码类型：register(默认)、login、reset_password、change_email
 * @param {string} data.turnstile_token - Cloudflare Turnstile 人机验证令牌
 */
export const sendVerificationCode = async (data) => {
    const result = await request('/verification/send-code', {
        method: 'POST',
        body: JSON.stringify({
            email: data.email,
            type: data.type || 'register',
            turnstile_token: data.turnstile_token, // 必需：人机验证
        }),
        skipAuth: true,
    });

    return result.data;
};

/**
 * 验证邮箱
 * @param {Object} data - 验证数据
 * @param {string} data.email - 待验证的邮箱
 * @param {string} data.code - 6位数字验证码
 */
export const verifyEmail = async (data) => {
    const result = await request('/verification/verify-email', {
        method: 'POST',
        body: JSON.stringify({
            email: data.email,
            code: data.code,
        }),
        skipAuth: true, // 验证邮箱无需认证（注册流程可能还未登录）
    });

    return result.data;
};

/**
 * 导出工具方法
 */
export { getAccessToken, setAccessToken };
