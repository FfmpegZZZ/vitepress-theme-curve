/**
 * 认证状态管理
 */
import { defineStore } from 'pinia';
import * as authApi from '../api/auth';
import authConfig from '../config/auth.config';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        // 用户信息
        user: null,
        // 是否已认证
        isAuthenticated: false,
        // 令牌刷新定时器
        refreshTimer: null,
    }),

    getters: {
        // 获取用户名
        username: (state) => state.user?.username,
        // 获取用户邮箱
        email: (state) => state.user?.email,
        // 获取用户角色
        role: (state) => state.user?.role,
    },

    actions: {
        /**
         * 用户注册
         */
        async register(data) {
            try {
                const result = await authApi.register(data);
                this.user = result.user;
                this.isAuthenticated = true;
                this.startTokenRefresh();
                return result;
            } catch (error) {
                throw error;
            }
        },

        /**
         * 用户登录
         */
        async login(data) {
            try {
                const result = await authApi.login(data);
                this.user = result.user;
                this.isAuthenticated = true;
                this.startTokenRefresh();
                return result;
            } catch (error) {
                throw error;
            }
        },

        /**
         * 用户登出
         */
        async logout() {
            try {
                await authApi.logout();
            } finally {
                this.user = null;
                this.isAuthenticated = false;
                this.stopTokenRefresh();
            }
        },

        /**
         * 刷新令牌
         */
        async refreshToken() {
            try {
                const result = await authApi.refreshToken();
                return result;
            } catch (error) {
                // 刷新失败，清除用户状态
                this.user = null;
                this.isAuthenticated = false;
                this.stopTokenRefresh();
                throw error;
            }
        },

        /**
         * 获取当前用户信息
         */
        async fetchUser() {
            try {
                const user = await authApi.getCurrentUser();
                this.user = user;
                this.isAuthenticated = true;
                this.startTokenRefresh();
                return user;
            } catch (error) {
                // 获取失败，清除状态
                this.user = null;
                this.isAuthenticated = false;
                throw error;
            }
        },

        /**
         * 更新用户信息
         */
        async updateUserInfo(data) {
            try {
                const user = await authApi.updateUserInfo(data);
                this.user = user;
                return user;
            } catch (error) {
                throw error;
            }
        },

        /**
         * 启动令牌自动刷新
         */
        startTokenRefresh() {
            // 清除现有定时器
            this.stopTokenRefresh();

            // 设置新的定时器
            this.refreshTimer = setInterval(async () => {
                try {
                    await this.refreshToken();
                    console.log('Token refreshed successfully');
                } catch (error) {
                    console.error('Token refresh failed:', error);
                }
            }, authConfig.tokenRefreshInterval);
        },

        /**
         * 停止令牌自动刷新
         */
        stopTokenRefresh() {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
            }
        },

        /**
         * 初始化认证状态
         * 检查本地是否有 token，如果有则尝试获取用户信息
         */
        async init() {
            const token = authApi.getAccessToken();
            if (token) {
                try {
                    await this.fetchUser();
                } catch (error) {
                    // Token 无效，清除
                    console.log('Token invalid, clearing auth state');
                    authApi.setAccessToken(null);
                }
            }
        },
    },

    // 持久化配置
    persist: {
        key: 'auth-store',
        storage: typeof window !== 'undefined' ? localStorage : null,
        paths: ['user', 'isAuthenticated'],
    },
});
