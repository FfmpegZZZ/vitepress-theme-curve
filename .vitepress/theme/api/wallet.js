/**
 * 钱包 & 支付 API 模块
 */
import authConfig from '../config/auth.config';
import { getAccessToken } from './auth';

const { apiBaseUrl } = authConfig;

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
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
        credentials: 'include',
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.error?.message || 'Request failed');
            error.code = data.error?.code;
            error.status = response.status;
            error.details = data.error?.details;
            throw error;
        }

        return data;
    } catch (error) {
        if (!error.status) {
            error.message = '网络连接失败，请检查您的网络';
        }
        throw error;
    }
};

/**
 * 获取钱包余额
 */
export const getWalletBalance = async () => {
    const result = await request('/wallet/balance', {
        method: 'GET',
    });
    return result.data;
};

/**
 * 获取交易记录
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 */
export const getTransactions = async (params = {}) => {
    const { page = 1, limit = 20 } = params;
    const queryString = new URLSearchParams({ page, limit }).toString();

    const result = await request(`/wallet/transactions?${queryString}`, {
        method: 'GET',
    });

    return result;
};

/**
 * 创建充值订单
 * @param {Object} data - 充值数据
 * @param {string} data.amount - 充值金额
 * @param {string} data.payment_method - 支付方式 (alipay/wechat)
 * @param {string} [data.device] - 设备类型 (pc/mobile)，可选，默认为 pc
 * @param {string} idempotencyKey - 幂等性键
 */
export const createDepositOrder = async (data, idempotencyKey) => {
    const result = await request('/payment/deposit', {
        method: 'POST',
        headers: {
            'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(data),
    });
    return result.data;
};

/**
 * 获取支付订单列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 */
export const getPaymentOrders = async (params = {}) => {
    const { page = 1, limit = 20 } = params;
    const queryString = new URLSearchParams({ page, limit }).toString();

    const result = await request(`/payment/orders?${queryString}`, {
        method: 'GET',
    });

    return result;
};

/**
 * 获取订单详情
 * @param {string} orderId - 订单ID
 */
export const getOrderDetail = async (orderId) => {
    const result = await request(`/payment/orders/${orderId}`, {
        method: 'GET',
    });
    return result.data;
};

/**
 * 取消订单
 * @param {string} orderId - 订单ID
 */
export const cancelOrder = async (orderId) => {
    const result = await request(`/payment/orders/${orderId}/cancel`, {
        method: 'POST',
    });
    return result.data;
};

/**
 * 同步订单状态（主动查询支付宝）
 * @param {string} orderNo - 商户订单号 (out_trade_no)
 */
export const syncOrderStatus = async (orderNo) => {
    const result = await request('/payment/orders/sync', {
        method: 'POST',
        body: JSON.stringify({
            order_no: orderNo
        })
    });
    return result; // 注意：直接返回 result，因为通常通用请求 wrap 了 data，或者我们要看后端返回结构。user said response is json object. checking request wrapper...
};
