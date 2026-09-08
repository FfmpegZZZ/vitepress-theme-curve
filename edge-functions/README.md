# EdgeOne Functions 配置

## 神明恋爱放送中邀请码互助池

`api/godly-love.js` 会映射为 `/api/godly-love`，使用 EdgeOne Makers Blob 的强一致读取和条件写保存推荐码、复制记录、反馈记录和小时额度。

部署前只需要在 EdgeOne Makers 项目中添加环境变量 `INVITE_POOL_SESSION_SECRET`，值使用至少 32 个字符的随机字符串。不要把该值提交到仓库。

函数首次访问 `getStore("godly-love-invite-pool")` 时，平台会自动创建同名 Blob 命名空间，无需在控制台手工创建。

为避免并发重传误删新记录，邀请码首次上传后会保留永久 claim；达到 3 次“已用完”反馈后只下架，不允许普通用户重新上传同一码。小时额度采用 UTC 固定小时窗口。线上会优先使用 `request.eo.clientIp` 的 HMAC 摘要作为防刷标识，不会保存原始 IP；仍建议在 EdgeOne 控制台为 `/api/godly-love` 配置精准速率限制。

本地联调 Functions 时，先关联 Makers 项目，再启动统一开发服务：

```bash
edgeone makers link
edgeone makers dev
```

接口约定：

- `GET /api/godly-love`：获取随机推荐码、自己的推荐码与剩余额度。
- `POST /api/godly-love`：提交 `upload`、`copy` 或 `vote` 操作。
