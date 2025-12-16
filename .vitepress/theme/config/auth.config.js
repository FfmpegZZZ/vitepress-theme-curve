/**
 * 认证系统配置
 */
export default {
    // API 基础 URL
    apiBaseUrl: 'https://auth.wudu.hk/api/v1',

    // Cloudflare Turnstile 站点密钥
    turnstileSiteKey: '0x4AAAAAACFkvsqEPZtKx_v_',

    // 令牌刷新间隔 (14 分钟，令牌 15 分钟过期)
    tokenRefreshInterval: 840000,

    // Access Token 过期时间 (15 分钟)
    accessTokenExpiry: 900000,
};
