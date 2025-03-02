<template>
  <div class="project">
    <Banner
      type="page"
      title="我的项目"
      desc="无限进步"
      footer="写 BUG 小能手"
      image="https://vip.123pan.cn/1825579031/13162562"
    >
      <template #footer-slot>
        <a class="to-github" href="https://github.com/imsyy/" target="_blank">
          <i class="iconfont icon-github"></i>
          <span>前往 Github</span>
        </a>
      </template>
    </Banner>
  </div>
</template>

<script setup>
import Banner from "@/components/Banner.vue";
</script>

<style lang="scss" scoped>
.project {
  .banner-page {
    .to-github {
      height: 40px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50px;
      color: #fff;
      background-color: #000000;
      transition:
        color 0.3s,
        background-color 0.3s;
      .iconfont {
        margin-right: 8px;
        transition: color 0.3s;
      }
      &:hover {
        color: #fff;
        background-color: #333333;
        .iconfont {
          color: #fff !important;
        }
      }
    }
  }
}
</style>
