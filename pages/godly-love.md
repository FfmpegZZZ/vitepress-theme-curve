---
title: 神明恋爱放送中邀请码互助池
description: 神明恋爱放送中玩家推荐码互助工具，上传自己的推荐码并随机获取其他玩家的邀请码。
layout: page
aside: false
comment: false
---

<script setup>
import { defineAsyncComponent } from 'vue';

// 独立分包，防止页面 lean 构建剔除接口加载后才挂载的静态节点。
const GodlyLoveInvitePool = defineAsyncComponent(() =>
  import('../.vitepress/theme/views/GodlyLoveInvitePool.vue')
);
</script>

<GodlyLoveInvitePool />
