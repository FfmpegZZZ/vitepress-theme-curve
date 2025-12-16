# 认证系统使用指南

## 概述

本项目已集成完整的用户认证系统,包含以下特性:

- ✨ **Three.js WebGL 动画背景** - 粒子星空 + 几何波浪效果
- 🎨 **现代化 UI 设计** - 玻璃态效果、渐变色、流畅动画
- 🔐 **完整认证流程** - 注册、登录、自动令牌刷新、登出
- 🤖 **Cloudflare Turnstile** - 人机验证保护
- 💾 **状态持久化** - 使用 Pinia + localStorage
- 📱 **响应式设计** - 完美适配桌面端和移动端

## 快速开始

### 1. 访问登录界面

点击导航栏右上角的 **用户图标** 按钮即可打开登录模态框。

### 2. 注册新账户

1. 在登录表单中点击 **"立即注册"**
2. 填写以下信息:
   - **用户名**: 3-32个字符
   - **邮箱**: 有效的邮箱地址
   - **密码**: 至少8个字符
   - **确认密码**: 与密码一致
3. 完成 Cloudflare Turnstile 人机验证
4. 点击 **"注册"** 按钮

注册成功后会自动登录并关闭模态框。

### 3. 登录账户

1. 填写邮箱和密码
2. 完成 Turnstile 验证
3. 点击 **"登录"** 按钮

登录成功后:
- 模态框自动关闭
- 导航栏显示用户名和头像
- 用户状态保存到本地存储

### 4. 用户菜单

登录后,点击导航栏的用户头像可以:
- 查看用户信息(用户名、邮箱)
- 点击 **"登出"** 退出账户

## 技术实现

### API 配置

API 配置文件位于 `.vitepress/theme/config/auth.config.js`:

```javascript
export default {
  apiBaseUrl: 'https://auth.wudu.hk/api/v1',
  turnstileSiteKey: '0x4AAAAAACFkvsqEPZtKx_v_',
  tokenRefreshInterval: 840000, // 14分钟
  accessTokenExpiry: 900000, // 15分钟
};
```

### 状态管理

使用 Pinia 管理认证状态,主要 actions:

- `register(data)` - 用户注册
- `login(data)` - 用户登录
- `logout()` - 用户登出
- `refreshToken()` - 刷新访问令牌
- `fetchUser()` - 获取当前用户信息
- `init()` - 初始化认证状态

### 自动令牌刷新

系统会在令牌过期前 1 分钟自动刷新,无需用户手动操作。如果刷新失败,用户状态会被清除,需要重新登录。

### 组件结构

```
components/Auth/
├── AuthBackground.vue    # Three.js 动画背景
├── AuthModal.vue         # 认证模态框容器
├── LoginForm.vue         # 登录表单
├── RegisterForm.vue      # 注册表单
└── TurnstileWidget.vue   # Turnstile 验证组件
```

## Three.js 动画说明

### 粒子系统

- **桌面端**: 3000 个粒子
- **移动端**: 1000 个粒子(性能优化)
- **颜色**: 蓝色、紫色、粉色渐变
- **动画**: 旋转 + 漂浮效果

### 几何波浪

- 使用自定义 ShaderMaterial
- 实时计算波浪高度
- 颜色随高度变化
- 线框模式渲染

### 交互效果

- 鼠标移动时相机视角跟随
- 窗口大小调整时自动适配
- 性能优化:使用 `requestAnimationFrame`

## 错误处理

系统会处理以下错误情况:

| 错误码 | 说明 | 用户提示 |
|-------|------|---------|
| `ERR_UNAUTHORIZED` | 邮箱或密码错误 | "邮箱或密码错误" |
| `ERR_FORBIDDEN` | 账号已被封禁 | "账号已被封禁" |
| `ERR_CONFLICT` | 用户名或邮箱已存在 | "用户名或邮箱已被使用" |
| `ERR_VALIDATION` | 输入验证失败 | "输入信息有误,请检查" |
| `ERR_TURNSTILE` | 人机验证失败 | "人机验证失败,请重试" |
| 网络错误 | 无法连接服务器 | "网络连接失败,请检查您的网络" |

## 样式定制

认证系统使用玻璃态设计,主要样式变量:

```scss
// 玻璃态背景
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.2);

// 渐变按钮
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// 输入框聚焦
border-color: rgba(102, 126, 234, 0.6);
box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
```

## 性能优化

1. **Three.js 优化**:
   - 移动端降低粒子数量
   - 使用 `powerPreference: 'high-performance'`
   - 限制 `devicePixelRatio` 最大为 2

2. **组件懒加载**:
   - Turnstile 脚本按需加载
   - 模态框使用 Teleport 避免影响主渲染

3. **资源清理**:
   - 组件卸载时清理 Three.js 资源
   - 移除事件监听器
   - 取消动画帧请求

## 安全性

1. **令牌管理**:
   - Access Token 存储在 localStorage
   - Refresh Token 通过 HttpOnly Cookie 传输
   - 自动刷新机制防止令牌过期

2. **人机验证**:
   - Cloudflare Turnstile 保护所有认证端点
   - 防止自动化攻击

3. **HTTPS**:
   - 生产环境强制使用 HTTPS
   - Cookie 设置 Secure 和 SameSite 属性

## 浏览器兼容性

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Three.js 需要 WebGL 支持,旧版浏览器可能无法显示动画背景。

## 故障排除

### 问题: 登录后刷新页面需要重新登录

**解决方案**: 检查浏览器是否禁用了 localStorage 或 Cookie。

### 问题: Turnstile 验证无法加载

**解决方案**: 
1. 检查网络连接
2. 确认 Turnstile 站点密钥正确
3. 检查浏览器控制台错误信息

### 问题: Three.js 动画卡顿

**解决方案**:
1. 检查设备性能
2. 关闭其他占用 GPU 的应用
3. 移动端会自动降低粒子数量

### 问题: 无法连接到 API

**解决方案**:
1. 检查 API 地址配置是否正确
2. 确认后端服务正常运行
3. 检查网络防火墙设置

## 开发调试

### 查看认证状态

在浏览器控制台:

```javascript
// 获取 auth store
const authStore = useAuthStore();

// 查看用户信息
console.log(authStore.user);

// 查看认证状态
console.log(authStore.isAuthenticated);

// 查看 access token
console.log(localStorage.getItem('access_token'));
```

### 测试令牌刷新

修改 `auth.config.js` 中的 `tokenRefreshInterval` 为较小值(如 10000 = 10秒)来测试自动刷新功能。

### 调试 Three.js

在 `AuthBackground.vue` 的 `animate()` 函数中添加:

```javascript
console.log('FPS:', Math.round(1000 / (Date.now() - lastTime)));
```

## 未来改进

- [ ] 支持第三方登录(Google, GitHub 等)
- [ ] 添加忘记密码功能
- [ ] 支持邮箱验证
- [ ] 用户头像上传
- [ ] 更多 Three.js 动画主题选择
- [ ] 深色模式优化

## 相关文件

- **API**: `.vitepress/theme/api/auth.js`
- **状态管理**: `.vitepress/theme/store/authStore.js`
- **配置**: `.vitepress/theme/config/auth.config.js`
- **组件**: `.vitepress/theme/components/Auth/`
- **样式**: `.vitepress/theme/style/auth.scss`

## 联系支持

如有问题或建议,请通过以下方式联系:

- 📧 Email: support@example.com
- 💬 GitHub Issues: [项目仓库](https://github.com/your-repo)
