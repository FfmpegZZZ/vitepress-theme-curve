<template>
  <div class="qa-container">
    <h1 class="title">常见问题解答</h1>
    <p class="subtitle">在这里找到你可能遇到的问题和解决方案</p>

    <!-- 搜索框 -->
    <div class="search-box">
      <i class="iconfont icon-search"></i>
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="搜索问题..." 
        class="search-input"
      />
      <span v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
        <i class="iconfont icon-close"></i>
      </span>
    </div>


    <!-- 问题列表 -->
    <div class="qa-content">
      <TransitionGroup name="list" tag="div" class="qa-list">
        <div 
          v-for="(item, index) in filteredQuestions" 
          :key="index" 
          class="qa-item"
          :class="{ active: activeIndex === index }"
          @click="toggleItem(index)"
        >
          <div class="qa-question">
            <div class="question-content">
              <span class="question-number">Q{{ index + 1 }}</span>
              <h3 class="question-text">{{ item.question }}</h3>
            </div>
            <div class="toggle-icon">
              <i class="iconfont" :class="activeIndex === index ? 'icon-up' : 'icon-down'"></i>
            </div>
          </div>
          
          <Transition name="slide">
            <div v-show="activeIndex === index" class="qa-answer">
              <div class="answer-content">
                <ul v-if="Array.isArray(item.answer)" class="answer-list">
                  <li v-for="(ans, idx) in item.answer" :key="idx" class="answer-item">
                    <span v-if="isLink(ans)">
                      <a :href="extractLink(ans)" target="_blank" rel="noopener noreferrer" class="answer-link">
                        {{ ans }}
                      </a>
                    </span>
                    <span v-else>{{ ans }}</span>
                  </li>
                </ul>
                <p v-else class="answer-text">{{ item.answer }}</p>
              </div>
            </div>
          </Transition>
        </div>
      </TransitionGroup>

      <!-- 无结果提示 -->
      <div v-if="filteredQuestions.length === 0" class="no-results">
        <i class="iconfont icon-folder"></i>
        <p>未找到相关问题</p>
        <span>试试其他关键词吧</span>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="qa-footer">
      <div class="footer-card">
        <i class="iconfont icon-chat"></i>
        <div class="footer-content">
          <h4>还有其他问题?</h4>
          <p>如果以上问题没有解决你的疑问，可以加入QQ群组或通过社交平台联系我们</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const searchQuery = ref('');
const activeIndex = ref(null);

const qaList = [
  {
    question: "网页无法正常访问该如何处理？",
    answer: [
      "建议更换浏览器进行访问，推荐使用 Microsoft Edge、Google Chrome 或 Bing 浏览器",
      "若仍无法访问，可尝试使用网络加速工具"
    ]
  },
  {
    question: "Erolabs 网页加载缓慢的解决方案？",
    answer: [
      "请耐心等待网页加载完成",
      "尝试切换网络环境（移动数据/WiFi）",
      "更换其他浏览器访问",
      "使用网络加速工具优化连接",
      "根据实际情况尝试其他可行方案"
    ]
  },
  {
    question: "安装应用时提示高风险如何解决？",
    answer: [
      "开启设备飞行模式或断开所有网络连接后重新安装应用"
    ]
  },
  {
    question: "如何获取电子邮箱地址？",
    answer: [
      "建议先观看电子邮箱基础教程：https://www.bilibili.com/video/BV1Mm421V7nr/",
      "下载并注册 QQ 账号",
      "下载 QQ 邮箱应用，使用已注册的 QQ 账号登录",
      "您的电子邮箱地址格式为：您的QQ号@qq.com"
    ]
  },
  {
    question: "游戏无法启动或出现黑屏怎么办？",
    answer: [
      "尝试切换网络环境（移动数据/WiFi）",
      "使用网络加速工具（VPN）优化连接",
      "完全退出应用后重新启动，建议多次尝试"
    ]
  },
  {
    question: "安卓系统如何安装群文件中的安装包？",
    answer: [
      "第一步：下载并安装 QQ 浏览器",
      "第二步：从群文件下载所需游戏的安装包",
      "第三步：下载完成后选择「使用其他应用打开」",
      "第四步：选择使用 QQ 浏览器打开",
      "如需修改默认应用设置，请参考以下路径：",
      "华为设备：系统设置 → 应用 → 默认应用 → 更多默认应用",
      "小米设备：系统设置 → 应用设置 → 应用管理 → 默认应用设置（右上角菜单）",
      "OPPO设备：系统设置 → 应用设置 → 应用管理 → 默认应用设置（右上角菜单）",
      "VIVO设备：系统设置 → 应用与权限 → 权限管理 → 权限 → 默认应用设置（底部）",
      "第五步：点击安装按钮完成安装",
      "若安装时提示高风险，请参考上述第3个问题的解决方案"
    ]
  },
  {
    question: "Jock Studio 无法进入或卡顿的处理方法？",
    answer: [
      "主界面卡顿：可能是设备兼容性问题导致",
      "游戏过程中卡顿：通常是操作过快导致，建议重启游戏后降低操作频率"
    ]
  },
  {
    question: "iOS 系统提示「未受信任的企业级开发者」如何处理？",
    answer: [
      "第一步：打开设备「设置」",
      "第二步：进入「通用」选项",
      "第三步：选择「VPN 与设备管理」",
      "第四步：找到对应应用并点击「信任」",
      "若问题仍未解决，建议卸载后重新安装应用"
    ]
  },
  {
    question: "XXL猛汉特区注册时人机验证相关问题？",
    answer: [
      "切换至移动数据网络",
      "使用网络加速工具",
      "清除应用后台进程",
      "重启设备后重试",
      "卸载应用后重新安装"
    ]
  },
  {
    question: "Erolabs 账号密码遗忘的找回流程？",
    answer: [
      "第一步：访问 Erolabs 官方网站",
      "第二步：在登录界面选择「找回账号」功能",
      "第三步：系统将向您的注册邮箱发送验证码",
      "第四步：登录注册时使用的邮箱查收验证码",
      "第五步：输入验证码进行验证",
      "第六步：设置新密码",
      "第七步：使用新密码登录账号",
      "重要提示：请务必将密码保存至手机备忘录或其他安全位置"
    ]
  },
  {
    question: "Erolabs 官方客服联系方式？",
    answer: [
      "官方客服支持页面：https://game.ero-labs.one/cn/qa.html"
    ]
  },
  {
    question: "电脑模拟器安装游戏的操作步骤？",
    answer: [
      "第一步：下载并安装安卓模拟器（如 MuMu 模拟器等）",
      "第二步：从群文件下载目标游戏安装包",
      "第三步：移除文件名末尾的 .1 后缀（例如：将「游戏名.apk.1」改为「游戏名.apk」）",
      "第四步：将修改后的安装包导入模拟器并完成安装"
    ]
  },
  {
    question: "Jock Studio 电脑端中文化方案？",
    answer: [
      "推荐使用 LunaTranslator 翻译工具，下载后直接运行即可",
      "详细使用教程请参考：https://www.bilibili.com/video/BV1x1CsYhE9Y/",
      "下载地址（群文件同步提供）：https://github.com/HIllya51/LunaTranslator",
      "注意：Demo 2.1 版本不支持内嵌模式，请使用显示模式"
    ]
  },
  {
    question: "Jock Studio/Camp Buddy 移动端中文化方案？",
    answer: [
      "方案一：使用设备自带的屏幕实时翻译功能",
      "方案二：使用第三方翻译应用，推荐沉浸式翻译、有道翻译等"
    ]
  },
  {
    question: "Blits Games 游戏商店购买指南",
    answer: [
      "重要提示：请根据个人经济情况理性消费，量力而行",
      "官方商店地址：https://www.blitsgames.com/store/",
      "温馨提示：游戏会不定期开启折扣活动，建议关注优惠时段购买",
      "价格参考（美元换算人民币，汇率按 1:8 计算）：",
      "Camp Buddy 标准版：$44.99-49.99（约 ¥350-400）",
      "Camp Buddy 典藏版：$64.99-69.99（约 ¥520-580）",
      "教官季标准版：$34.99-39.99（约 ¥280-320）",
      "教官季典藏版：$49.99-54.99（约 ¥400-440）",
      "教官季 DLC：$14.99（约 ¥120）",
      "Jock Studio（预购）：$49.99（约 ¥400）"
    ]
  }
];

const filteredQuestions = computed(() => {
  if (!searchQuery.value) {
    return qaList;
  }
  const query = searchQuery.value.toLowerCase();
  return qaList.filter(item => 
    item.question.toLowerCase().includes(query) ||
    (Array.isArray(item.answer) 
      ? item.answer.some(ans => ans.toLowerCase().includes(query))
      : item.answer.toLowerCase().includes(query)
    )
  );
});

const toggleItem = (index) => {
  activeIndex.value = activeIndex.value === index ? null : index;
};

const isLink = (text) => {
  return text.includes('http://') || text.includes('https://');
};

const extractLink = (text) => {
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : text;
};
</script>

<style lang="scss" scoped>
  .qa-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
  animation: fade-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;  .title {
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
    margin-bottom: 2rem;
  }

  .search-box {
    position: relative;
    max-width: 600px;
    margin: 0 auto 2rem;
    display: flex;
    align-items: center;
    background-color: var(--main-card-background);
    border: 2px solid var(--main-card-border);
    border-radius: 50px;
    padding: 0.8rem 1.5rem;
    transition: all 0.3s;

    &:focus-within {
      border-color: var(--main-color);
      box-shadow: 0 4px 16px -4px var(--main-color-bg);
    }

    .icon-search {
      font-size: 20px;
      color: var(--main-font-second-color);
      margin-right: 1rem;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 1rem;
      color: var(--main-font-color);

      &::placeholder {
        color: var(--main-font-second-color);
        opacity: 0.6;
      }
    }

    .clear-btn {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: var(--main-font-second-color);
      opacity: 0.3;
      transition: all 0.3s;

      &:hover {
        opacity: 1;
        background-color: var(--main-color);
      }

      .icon-close {
        font-size: 12px;
        color: var(--main-card-background);
      }
    }
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 3rem;
    margin-bottom: 3rem;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-number {
        font-size: 2rem;
        font-weight: bold;
        color: var(--main-color);
        margin-bottom: 0.3rem;
      }

      .stat-label {
        font-size: 0.9rem;
        color: var(--main-font-second-color);
      }
    }
  }

  .qa-content {
    margin-bottom: 2rem;

    .qa-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .qa-item {
      background-color: var(--main-card-background);
      border: 1px solid var(--main-card-border);
      border-radius: 16px;
      box-shadow: 0 4px 12px -2px var(--main-border-shadow);
      overflow: hidden;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), 
                  box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      will-change: transform;
      backface-visibility: hidden;
      -webkit-font-smoothing: antialiased;

      &:hover {
        transform: translate3d(0, -2px, 0);
        box-shadow: 0 8px 24px -4px var(--main-border-shadow);
        border-color: var(--main-color);
      }

      &.active {
        border-color: var(--main-color);
        box-shadow: 0 8px 24px -4px var(--main-color-bg);
      }

      .qa-question {
        display: flex;
        align-items: center;
        padding: 1.5rem;
        gap: 1rem;

        .question-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;

          .question-number {
            font-size: 0.8rem;
            font-weight: bold;
            color: var(--main-color);
            letter-spacing: 0.05em;
          }

          .question-text {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--main-font-color);
            line-height: 1.4;
          }
        }

        .toggle-icon {
          width: 32px;
          height: 32px;
          min-width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background-color: var(--main-background);
          transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: background-color;

          .iconfont {
            font-size: 18px;
            color: var(--main-font-second-color);
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), 
                        color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: transform, color;
          }
        }

        &:hover .toggle-icon {
          background-color: var(--main-color);

          .iconfont {
            color: #fff;
          }
        }
      }

      .qa-answer {
        border-top: 1px solid var(--main-card-border);
        padding: 1.5rem;
        background-color: var(--main-background);

        .answer-content {
          flex: 1;

          .answer-list {
            list-style: none;
            padding: 0;
            margin: 0;

            .answer-item {
              position: relative;
              padding-left: 1.5rem;
              margin-bottom: 0.8rem;
              line-height: 1.6;
              color: var(--main-font-second-color);

              &::before {
                content: "•";
                position: absolute;
                left: 0.5rem;
                color: var(--main-color);
                font-weight: bold;
              }

              &:last-child {
                margin-bottom: 0;
              }

              .answer-link {
                color: var(--main-color);
                text-decoration: none;
                border-bottom: 1px dashed var(--main-color);
                transition: all 0.3s;
                word-break: break-all;

                &:hover {
                  border-bottom-style: solid;
                  opacity: 0.8;
                }
              }
            }
          }

          .answer-text {
            margin: 0;
            line-height: 1.6;
            color: var(--main-font-second-color);
          }
        }
      }
    }

    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: var(--main-font-second-color);

      .iconfont {
        font-size: 4rem;
        opacity: 0.3;
        margin-bottom: 1rem;
      }

      p {
        font-size: 1.2rem;
        margin: 0.5rem 0;
      }

      span {
        font-size: 0.9rem;
        opacity: 0.6;
      }
    }
  }

  .qa-footer {
    margin-top: 3rem;

    .footer-card {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 2rem;
      background: linear-gradient(135deg, var(--main-color-bg), var(--main-card-background));
      border: 1px solid var(--main-color);
      border-radius: 16px;
      box-shadow: 0 4px 16px -4px var(--main-color-bg);

      .iconfont {
        font-size: 3rem;
        color: var(--main-color);
      }

      .footer-content {
        flex: 1;

        h4 {
          margin: 0 0 0.5rem;
          font-size: 1.3rem;
          color: var(--main-font-color);
        }

        p {
          margin: 0;
          color: var(--main-font-second-color);
          line-height: 1.6;
        }
      }
    }
  }

  @media (max-width: 768px) {
    .title {
      font-size: 2rem;
    }

    .stats {
      gap: 2rem;

      .stat-item .stat-number {
        font-size: 1.5rem;
      }
    }

    .qa-content .qa-item {
      .qa-question {
        padding: 1rem;

        .question-content .question-text {
          font-size: 1rem;
        }
      }

      .qa-answer {
        padding: 1rem;
      }
    }

    .qa-footer .footer-card {
      flex-direction: column;
      text-align: center;

      .iconfont {
        font-size: 2.5rem;
      }
    }
  }
}

// 动画优化 - 使用 GPU 加速
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translate3d(0, 20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.slide-enter-active {
  transition: opacity 0.25s ease-out, max-height 0.25s ease-out;
  overflow: hidden;
}

.slide-leave-active {
  transition: opacity 0.2s ease-in, max-height 0.2s ease-in;
  overflow: hidden;
}

.slide-enter-from {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to {
  opacity: 1;
  max-height: 2000px;
}

.slide-leave-from {
  opacity: 1;
  max-height: 2000px;
}

.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

.list-enter-from {
  opacity: 0;
  transform: translate3d(-20px, 0, 0);
}

.list-leave-to {
  opacity: 0;
  transform: translate3d(20px, 0, 0);
}
</style>
