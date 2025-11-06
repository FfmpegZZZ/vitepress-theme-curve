<template>
  <div class="qqgroup">
    <h1 class="title">加入我们的QQ群组</h1>
    <p class="subtitle">与更多小伙伴一起交流</p>
    
    <div class="qqgroup-content">
      <!-- 交流群 -->
      <div 
        v-for="(group, index) in groupList" 
        :key="index"
        :class="['qqgroup-item', { 'group-full': group.status === '已满' }]"
        @click="joinGroup(group)"
      >
        <div class="qqgroup-icon">
          <i class="iconfont icon-qq"></i>
        </div>
        <div class="qqgroup-info">
          <div class="group-header">
            <span class="qqgroup-name">{{ group.name }}</span>
            <span :class="['group-status', group.status === '已满' ? 'status-full' : 'status-available']">
              {{ group.status }}
            </span>
          </div>
          <span class="qqgroup-number">群号：{{ group.number }}</span>
          <span v-if="group.status === '可加入'" class="qqgroup-hint">点击加入群聊</span>
        </div>
        <div class="qqgroup-arrow">
          <i class="iconfont icon-arrow-right"></i>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';

const groupList = ref([
  {
    name: "交流1群",
    number: "827825605",
    status: "已满",
    inviteCode: "dIubB0pmIa"
  }, {
    name: "交流2群",
    number: "465585624",
    status: "可加入",
    inviteCode: "Hlj63QvA0c"
  }, {
    name: "交流3群",
    number: "276501029",
    status: "可加入",
    inviteCode: "ZvBuT4DZSe"
  }, {
    name: "交流4群",
    number: "1027523228",
    status: "已满",
    inviteCode: "T3H9WcipOi"
  }, {
    name: "交流5群",
    number: "362211607",
    status: "可加入",
    inviteCode: "Jy1ES7NIuC"
  }, {
    name: "交流6群",
    number: "982730234",
    status: "可加入",
    inviteCode: "o7oNm6ko1"
  }, {
    name: "交流7群",
    number: "1004682263",
    status: "可加入",
    inviteCode: "6PQoY4elji"
  }, {
    name: "交流8群",
    number: "686304544",
    status: "已满",
    inviteCode: "6zSNBAOp3"
  }, {
    name: "交流9群",
    number: "481311601",
    status: "已满",
    inviteCode: "M1PWwXiR6"
  }, {
    name: "交流10群",
    number: "1034131062",
    status: "已满",
    inviteCode: "FcgLvoqs26"
  }, {
    name: "交流11群",
    number: "1050398192",
    status: "可加入",
    inviteCode: "pWsIR0w5wc"
  }, {
    name: "交流12群",
    number: "1018276775",
    status: "可加入",
    inviteCode: "E791Eik9Q4"
  }, {
    name: "防走失1群（禁言群）",
    number: "958187921",
    status: "已满",
    inviteCode: "eCOAj6c8k"
  }, {
    name: "防走失2群（禁言群）",
    number: "783335691",
    status: "已满",
    inviteCode: "Sc7heHmMw0"
  }, {
    name: "防走失3群（禁言群）",
    number: "1033695913",
    status: "可加入",
    inviteCode: "feNAD2o2fm"
  }
]);

// 加入群组
const joinGroup = (group) => {
  if (group.status === '已满') {
    $message.warning(`${group.name}已满员，请选择其他可用群组`);
    return;
  }
  
  const inviteUrl = `https://qm.qq.com/q/${group.inviteCode}`;
  $message.success(
    `即将跳转到${group.name}`,
    {
      close: true,
      duration: 1500,
    },
    () => {
      window.open(inviteUrl, '_blank');
    }
  );
};
</script>

<style lang="scss" scoped>
.qqgroup {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 0;
  animation: fade-up 0.5s ease-out;

  .title {
    font-size: 2.5rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: 1rem;
    color: var(--main-font-color);
  }

  .subtitle {
    text-align: center;
    font-size: 1rem;
    color: var(--main-font-second-color);
    margin-bottom: 3rem;
  }

  .qqgroup-content {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
    padding: 0 1rem;
    margin-bottom: 3rem;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .qqgroup-item {
      display: flex;
      align-items: center;
      padding: 1.5rem;
      background-color: var(--main-card-background);
      border: 1px solid var(--main-card-border);
      border-radius: 16px;
      box-shadow: 0 4px 12px -2px var(--main-border-shadow);
      transition: all 0.3s;
      cursor: pointer;
      text-decoration: none;
      color: var(--main-font-color);
      position: relative;
      overflow: hidden;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background-color: #12B7F5;
        transform: scaleY(0);
        transition: transform 0.3s;
      }

      &:hover:not(.group-full) {
        transform: translateY(-4px);
        border-color: #12B7F5;
        box-shadow: 0 8px 24px -4px rgba(18, 183, 245, 0.3);

        &::before {
          transform: scaleY(1);
        }

        .qqgroup-icon {
          transform: scale(1.1);
          color: #12B7F5;
        }

        .qqgroup-arrow {
          transform: translateX(4px);
          color: #12B7F5;
        }
      }

      &.group-full {
        opacity: 0.6;
        cursor: not-allowed;

        &::before {
          background-color: #999;
        }

        .qqgroup-icon {
          color: #999;
        }
      }

      .qqgroup-icon {
        width: 60px;
        height: 60px;
        min-width: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 1rem;
        border-radius: 12px;
        background-color: var(--main-background);
        transition: all 0.3s;
        color: #12B7F5;

        svg {
          width: 40px;
          height: 40px;
          fill: currentColor;
        }
      }

      .qqgroup-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .group-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .qqgroup-name {
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--main-font-color);
        }

        .group-status {
          font-size: 0.75rem;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-weight: 500;

          &.status-available {
            background-color: rgba(82, 196, 26, 0.1);
            color: #52c41a;
          }

          &.status-full {
            background-color: rgba(153, 153, 153, 0.1);
            color: #999;
          }
        }

        .qqgroup-number {
          font-size: 0.9rem;
          color: var(--main-font-second-color);
        }

        .qqgroup-hint {
          font-size: 0.85rem;
          color: #12B7F5;
          font-weight: 500;
        }
      }

      .qqgroup-arrow {
        font-size: 1.5rem;
        color: var(--main-font-second-color);
        transition: all 0.3s;

        .iconfont {
          font-size: 24px;
        }
      }
    }
  }

  .qqgroup-tips {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    background-color: var(--main-card-background);
    border: 1px solid var(--main-card-border);
    border-radius: 16px;
    box-shadow: 0 4px 12px -2px var(--main-border-shadow);

    h3 {
      font-size: 1.3rem;
      margin-bottom: 1rem;
      color: var(--main-font-color);
    }

    ul {
      list-style: none;
      padding-left: 0;

      li {
        padding: 0.5rem 0;
        color: var(--main-font-second-color);
        line-height: 1.6;
        position: relative;
        padding-left: 1.5rem;

        &::before {
          content: "•";
          position: absolute;
          left: 0.5rem;
          color: #12B7F5;
          font-weight: bold;
        }

        strong {
          color: var(--main-font-color);
          font-weight: 600;
        }
      }
    }

    @media (max-width: 768px) {
      margin: 0 1rem;
    }
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
