<template>
  <div class="invite-pool">
    <section class="pool-hero s-card">
      <div class="hero-main">
        <img
          class="game-icon"
          src="/images/app/神明恋爱放送中.png"
          alt="神明恋爱放送中游戏图标"
          width="88"
          height="88"
        />
        <div class="hero-copy">
          <span class="eyebrow">玩家互助工具</span>
          <h1>邀请码互助池</h1>
          <p>放入自己的推荐码，再挑选其他玩家的码去预约页面填写。</p>
        </div>
      </div>
      <div v-if="!loading && dashboard.joined" class="hero-stats" aria-label="互助池状态">
        <span
          ><strong>{{ dashboard.available }}</strong> 池中可用</span
        >
        <span
          ><strong>{{ copiedCount }}</strong> / {{ dashboard.config.pageSize }} 已复制</span
        >
      </div>
    </section>

    <section v-if="loading" class="state-card s-card" aria-live="polite">
      <span class="loading-ring" aria-hidden="true" />
      <div>
        <strong>正在进入互助池</strong>
        <p>正在同步最新推荐码与使用状态…</p>
      </div>
    </section>

    <section v-else-if="fatalError" class="state-card error-card s-card" role="alert">
      <span class="state-icon" aria-hidden="true">!</span>
      <div>
        <strong>暂时无法打开互助池</strong>
        <p>{{ fatalError }}</p>
        <button class="pool-button primary compact" type="button" @click="loadInitial">
          重新加载
        </button>
      </div>
    </section>

    <section v-else-if="!dashboard.joined" class="onboarding-layout">
      <div class="how-card s-card">
        <span class="section-kicker">互助方式</span>
        <h2>先分享，再互助</h2>
        <div class="steps">
          <div class="step-item">
            <span class="step-number">01</span>
            <div>
              <strong>放上你的推荐码</strong>
              <p>推荐码会进入公共池，供其他玩家随机抽取。</p>
            </div>
          </div>
          <div class="step-line" aria-hidden="true" />
          <div class="step-item">
            <span class="step-number">02</span>
            <div>
              <strong>复制别人的码</strong>
              <p>选一个推荐码，复制后去预约页面填写。</p>
            </div>
          </div>
        </div>
      </div>

      <form class="join-card s-card" @submit.prevent="submitOnboarding">
        <div class="form-heading">
          <span class="section-kicker">开始互助</span>
          <h2>填写你的推荐码</h2>
          <p>在游戏预约页面可以找到并复制自己的 8 位推荐码。</p>
        </div>
        <label class="code-label" for="onboarding-code">推荐码</label>
        <input
          id="onboarding-code"
          ref="onboardingInput"
          class="code-input"
          :class="{ invalid: onboardingError }"
          :value="onboardingCode"
          maxlength="16"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          inputmode="text"
          placeholder="XXXXXXXX"
          @input="handleOnboardingInput"
        />
        <p class="field-hint" :class="{ error: onboardingError }">
          {{ onboardingError || `${onboardingCode.length} / 8 位字母或数字` }}
        </p>
        <button class="pool-button primary wide" type="submit" :disabled="submittingCode">
          <span v-if="submittingCode" class="button-spinner" aria-hidden="true" />
          {{ submittingCode ? "正在放入…" : "放入推荐码，开始互助" }}
        </button>
      </form>
    </section>

    <template v-else>
      <div class="section-heading">
        <div>
          <span class="section-kicker">本轮推荐</span>
          <h2>挑一个还没试过的码</h2>
        </div>
      </div>

      <TransitionGroup v-if="dashboard.items.length" name="code-list" tag="div" class="code-grid">
        <article v-for="item in dashboard.items" :key="item.id" class="invite-card s-card">
          <div class="card-topline">
            <span class="live-badge"><i aria-hidden="true" /> 可使用</span>
            <span class="card-time">{{ formatRelativeTime(item.createdAt) }}</span>
          </div>
          <button
            class="code-value"
            :class="{ copied: isCopied(item) }"
            type="button"
            :aria-label="`复制推荐码 ${item.code}`"
            @click="copyCode(item)"
          >
            {{ item.code }}
          </button>
          <div class="card-actions">
            <button
              class="pool-button primary"
              type="button"
              :disabled="copyingId === item.id || votingId === item.id"
              @click="copyCode(item)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 8h11v11H8z" />
                <path d="M16 8V5H5v11h3" />
              </svg>
              {{ copyingId === item.id ? "同步中…" : isCopied(item) ? "再次复制" : "复制" }}
            </button>
            <button
              class="pool-button secondary"
              type="button"
              :disabled="votingId === item.id || copyingId === item.id"
              @click="reportUsed(item)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v10" />
                <path d="m8 9 4 4 4-4" />
                <path d="M5 17h14" />
              </svg>
              {{ votingId === item.id ? "提交中…" : "已用完" }}
            </button>
          </div>
        </article>
      </TransitionGroup>

      <section v-else class="empty-card s-card">
        <div class="empty-mark" aria-hidden="true">∞</div>
        <h2>这一轮暂时没有可用码</h2>
        <p>可以换一批再看看，或上传一个新的推荐码帮助其他玩家。</p>
        <button class="pool-button primary" type="button" @click="openUpload">上传推荐码</button>
      </section>

      <!-- 额度、去重及下架阈值由后端执行，不在玩家操作界面展示。 -->
      <div class="action-dock" role="group" aria-label="邀请码互助池操作">
        <button class="dock-action" type="button" :disabled="refreshing" @click="refreshBatch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7v5h-5" />
            <path d="M4 17v-5h5" />
            <path d="M6.1 9A7 7 0 0 1 18 6.4L20 9" />
            <path d="M17.9 15A7 7 0 0 1 6 17.6L4 15" />
          </svg>
          <span>{{ refreshing ? "刷新中" : "换一批" }}</span>
        </button>
        <button class="dock-action" type="button" @click="showMine = true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 7h11" />
            <path d="M8 12h11" />
            <path d="M8 17h11" />
            <path d="M4 7h.01" />
            <path d="M4 12h.01" />
            <path d="M4 17h.01" />
          </svg>
          <span>我的</span>
        </button>
        <button class="dock-action" type="button" @click="sharePool">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="18" cy="5" r="2" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="18" cy="19" r="2" />
            <path d="m8 11 8-5" />
            <path d="m8 13 8 5" />
          </svg>
          <span>分享</span>
        </button>
        <button class="dock-action primary" type="button" @click="openUpload">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span>上传</span>
        </button>
      </div>
    </template>

    <Modal
      :show="showUpload"
      title="上传推荐码"
      title-icon="game"
      :max-width="480"
      @mask-click="closeUpload"
      @modal-close="closeUpload"
    >
      <form class="modal-form" @submit.prevent="submitUpload">
        <p class="modal-description">
          分享你的推荐码，让其他玩家找到你。
        </p>
        <label class="code-label" for="upload-code">推荐码</label>
        <input
          id="upload-code"
          ref="uploadInput"
          class="code-input"
          :class="{ invalid: uploadError }"
          :value="uploadCode"
          maxlength="16"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          placeholder="XXXXXXXX"
          @input="handleUploadInput"
        />
        <p class="field-hint" :class="{ error: uploadError }">
          {{ uploadError || `${uploadCode.length} / 8 位字母或数字` }}
        </p>
        <button class="pool-button primary wide" type="submit" :disabled="submittingCode">
          <span v-if="submittingCode" class="button-spinner" aria-hidden="true" />
          {{ submittingCode ? "正在上传…" : "上传到互助池" }}
        </button>
      </form>
    </Modal>

    <Modal
      :show="showMine"
      title="我的推荐码"
      title-icon="list"
      :max-width="560"
      @mask-click="showMine = false"
      @modal-close="showMine = false"
    >
      <div class="mine-summary">
        <span>共上传 {{ dashboard.mine.length }} 个</span>
      </div>
      <div v-if="dashboard.mine.length" class="mine-list">
        <article v-for="item in dashboard.mine" :key="item.id" class="mine-item">
          <div>
            <strong>{{ item.code }}</strong>
            <time :datetime="new Date(item.createdAt).toISOString()">{{
              formatDate(item.createdAt)
            }}</time>
          </div>
          <span class="mine-state" :class="item.active ? 'active' : 'retired'">
            {{ item.active ? "展示中" : "已下架" }}
          </span>
        </article>
      </div>
      <div v-else class="modal-empty">你还没有上传过推荐码</div>
    </Modal>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import Modal from "../components/Modal.vue";
import {
  getInvitePool,
  markInviteCodeCopied,
  reportInviteCodeUsed,
  uploadInviteCode,
} from "../api/invitePool.js";

const DEFAULT_CONFIG = {
  game: "神明恋爱放送中",
  pageSize: 5,
  voteLimit: 3,
  activeOwnCap: 20,
  uploadPerHour: 5,
  votePerHour: 6,
};

const emptyDashboard = () => ({
  config: DEFAULT_CONFIG,
  items: [],
  available: 0,
  mine: [],
  joined: false,
  quota: {
    upload: { left: DEFAULT_CONFIG.uploadPerHour, resetIn: 0 },
    vote: { left: DEFAULT_CONFIG.votePerHour, resetIn: 0 },
  },
});

const dashboard = ref(emptyDashboard());
const loading = ref(true);
const fatalError = ref("");
const refreshing = ref(false);
const submittingCode = ref(false);
const copyingId = ref("");
const votingId = ref("");
const copiedIds = ref(new Set());

const onboardingCode = ref("");
const onboardingError = ref("");
const onboardingInput = ref(null);
const uploadCode = ref("");
const uploadError = ref("");
const uploadInput = ref(null);
const showUpload = ref(false);
const showMine = ref(false);

const copiedCount = computed(
  () => dashboard.value.items.filter((item) => item.copied || copiedIds.value.has(item.id)).length,
);

const normalizeCode = (value) =>
  String(value || "")
    .replace(/[\s_-]/g, "")
    .toUpperCase()
    .slice(0, 8);

const notify = (type, message) => {
  if (typeof window === "undefined") return;
  const method = window.$message?.[type];
  if (typeof method === "function") method(message);
};

const applyDashboard = (data, { resetCopied = true } = {}) => {
  dashboard.value = {
    ...emptyDashboard(),
    ...data,
    config: { ...DEFAULT_CONFIG, ...(data?.config || {}) },
    items: Array.isArray(data?.items) ? data.items : [],
    mine: Array.isArray(data?.mine) ? data.mine : [],
    quota: {
      upload: data?.quota?.upload || { left: DEFAULT_CONFIG.uploadPerHour, resetIn: 0 },
      vote: data?.quota?.vote || { left: DEFAULT_CONFIG.votePerHour, resetIn: 0 },
    },
  };
  if (resetCopied) copiedIds.value = new Set();
};

// 后端保留额度及容量校验，界面只提示用户下一步可以做什么。
const readableError = (error) => {
  if (error?.status === 429) return "请稍后再试";
  if (error?.code === "ACTIVE_LIMIT_REACHED") return "你还有推荐码正在展示，过段时间再来分享吧";
  return error?.message || "操作失败，请稍后再试";
};

const loadInitial = async () => {
  loading.value = true;
  fatalError.value = "";
  try {
    applyDashboard(await getInvitePool());
  } catch (error) {
    fatalError.value = readableError(error);
  } finally {
    loading.value = false;
  }
};

const handleOnboardingInput = (event) => {
  const value = normalizeCode(event.target.value);
  event.target.value = value;
  onboardingCode.value = value;
  onboardingError.value = "";
};

const handleUploadInput = (event) => {
  const value = normalizeCode(event.target.value);
  event.target.value = value;
  uploadCode.value = value;
  uploadError.value = "";
};

const validateCode = (value) => /^[A-Z0-9]{8}$/.test(value);

const submitOnboarding = async () => {
  if (!validateCode(onboardingCode.value)) {
    onboardingError.value = "需要完整的 8 位字母或数字";
    onboardingInput.value?.focus();
    return;
  }

  submittingCode.value = true;
  try {
    applyDashboard(await uploadInviteCode(onboardingCode.value));
    onboardingCode.value = "";
    notify("success", "推荐码已放入互助池");
  } catch (error) {
    onboardingError.value = readableError(error);
  } finally {
    submittingCode.value = false;
  }
};

const openUpload = () => {
  uploadCode.value = "";
  uploadError.value = "";
  showUpload.value = true;
  nextTick(() => uploadInput.value?.focus());
};

const closeUpload = () => {
  if (!submittingCode.value) showUpload.value = false;
};

const submitUpload = async () => {
  if (!validateCode(uploadCode.value)) {
    uploadError.value = "需要完整的 8 位字母或数字";
    uploadInput.value?.focus();
    return;
  }

  submittingCode.value = true;
  try {
    applyDashboard(await uploadInviteCode(uploadCode.value));
    showUpload.value = false;
    uploadCode.value = "";
    notify("success", "已上传，其他玩家现在可以看到它了");
  } catch (error) {
    uploadError.value = readableError(error);
  } finally {
    submittingCode.value = false;
  }
};

const legacyCopy = (text) => {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

const writeClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return legacyCopy(text);
    }
  }
  return legacyCopy(text);
};

const isCopied = (item) => item.copied || copiedIds.value.has(item.id);

const removeCandidate = (id, { noLongerActive = false } = {}) => {
  dashboard.value.items = dashboard.value.items.filter((candidate) => candidate.id !== id);
  const nextCopiedIds = new Set(copiedIds.value);
  nextCopiedIds.delete(id);
  copiedIds.value = nextCopiedIds;
  if (noLongerActive) {
    dashboard.value.available = Math.max(0, dashboard.value.available - 1);
  }
};

const copyCode = async (item) => {
  if (copyingId.value || votingId.value) return;
  copyingId.value = item.id;
  try {
    const copied = await writeClipboard(item.code);
    if (!copied) {
      notify("error", "复制失败，请长按推荐码手动复制");
      return;
    }

    await markInviteCodeCopied(item.id);
    item.copied = true;
    copiedIds.value = new Set([...copiedIds.value, item.id]);
    notify("success", `已复制 ${item.code}，去预约页面填写吧`);
  } catch (error) {
    if (error?.code === "CODE_RETIRED" || error?.code === "CODE_NOT_FOUND") {
      removeCandidate(item.id, { noLongerActive: true });
    }
    notify("warning", `推荐码已复制，但状态同步失败：${readableError(error)}`);
  } finally {
    copyingId.value = "";
  }
};

const reportUsed = async (item) => {
  if (copyingId.value || votingId.value) return;
  if (!isCopied(item)) {
    notify("info", "请先复制并尝试填写，确认无效后再反馈");
    return;
  }

  votingId.value = item.id;
  try {
    const result = await reportInviteCodeUsed(item.id);
    item.reports = result.reports;
    dashboard.value.quota.vote = result.quota;
    removeCandidate(item.id, { noLongerActive: result.retired });

    notify("success", "收到，谢谢你的反馈");
  } catch (error) {
    if (error?.code === "COPY_REQUIRED") {
      item.copied = false;
      const nextCopiedIds = new Set(copiedIds.value);
      nextCopiedIds.delete(item.id);
      copiedIds.value = nextCopiedIds;
    }
    if (error?.code === "ALREADY_REPORTED") {
      removeCandidate(item.id);
    } else if (error?.code === "CODE_RETIRED" || error?.code === "CODE_NOT_FOUND") {
      removeCandidate(item.id, { noLongerActive: true });
    }
    notify(error?.status === 429 ? "warning" : "error", readableError(error));
  } finally {
    votingId.value = "";
  }
};

const refreshBatch = async () => {
  if (refreshing.value) return;
  refreshing.value = true;
  const previousIds = dashboard.value.items.map((item) => item.id);
  try {
    applyDashboard(await getInvitePool(previousIds));
    notify("success", "已经换了一批推荐码");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    notify("error", readableError(error));
  } finally {
    refreshing.value = false;
  }
};

const sharePool = async () => {
  const data = {
    title: `${dashboard.value.config.game} · 邀请码互助池`,
    text: "互相借用推荐码，无需登录",
    url: window.location.href,
  };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  const copied = await writeClipboard(data.url);
  notify(
    copied ? "success" : "error",
    copied ? "页面链接已复制" : "链接复制失败，请手动复制地址栏",
  );
};

const formatDate = (timestamp) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));

const formatRelativeTime = (timestamp) => {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "刚刚上传";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
};

const handleEscape = (event) => {
  if (event.key !== "Escape" || submittingCode.value) return;
  showUpload.value = false;
  showMine.value = false;
};

onMounted(() => {
  window.addEventListener("keydown", handleEscape);
  loadInitial();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleEscape);
});
</script>

<style lang="scss" scoped>
.invite-pool {
  width: min(100%, 980px);
  margin: 0 auto 3rem;
  color: var(--main-font-color);

  h1,
  h2,
  p {
    margin: 0;
    padding: 0;
    border: 0;
    text-align: left;
    line-height: 1.55;
  }

  h1::after,
  h2::after {
    display: none;
  }

  .s-card {
    cursor: default;
  }
}

.pool-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  min-height: 180px;
  margin-bottom: 1.25rem;
  padding: 2rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 88% 20%, var(--main-color-bg) 0, transparent 34%),
    linear-gradient(135deg, var(--main-card-background), var(--main-card-second-background));

  &::after {
    position: absolute;
    right: -54px;
    bottom: -82px;
    width: 210px;
    height: 210px;
    content: "";
    border: 34px solid var(--main-color-bg);
    border-radius: 50%;
    opacity: 0.85;
    pointer-events: none;
  }
}

.hero-main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  min-width: 0;
}

.game-icon {
  --invite-icon-size: 88px;

  flex: 0 0 var(--invite-icon-size);
  width: var(--invite-icon-size) !important;
  max-width: var(--invite-icon-size);
  height: var(--invite-icon-size);
  object-fit: cover;
  border: 1px solid var(--main-card-border);
  border-radius: 22px;
  box-shadow: 0 12px 28px -10px var(--main-dark-shadow);
}

.hero-copy {
  h1 {
    margin-top: 0.2rem;
    font-size: clamp(1.8rem, 4vw, 2.55rem);
    font-weight: 750;
    letter-spacing: -0.04em;
  }

  p {
    max-width: 520px;
    margin-top: 0.45rem;
    color: var(--main-font-second-color);
    font-size: 1rem;
  }
}

.eyebrow,
.section-kicker {
  color: var(--main-color);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.hero-stats {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(2, minmax(92px, 1fr));
  gap: 0.6rem;

  span {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem 0.85rem;
    color: var(--main-font-second-color);
    font-size: 0.78rem;
    background: var(--main-card-background);
    border: 1px solid var(--main-card-border);
    border-radius: 12px;
  }

  strong {
    color: var(--main-color);
    font-size: 1.2rem;
  }
}

.state-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 210px;
  padding: 2rem;

  strong {
    font-size: 1.05rem;
  }

  p {
    margin: 0.3rem 0 0.9rem;
    color: var(--main-font-second-color);
    font-size: 0.92rem;
  }
}

.loading-ring,
.button-spinner {
  display: inline-block;
  border: 2px solid var(--main-card-border);
  border-top-color: var(--main-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-ring {
  width: 34px;
  height: 34px;
}

.button-spinner {
  width: 16px;
  height: 16px;
  border-color: rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
}

.state-icon {
  display: grid;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  place-items: center;
  color: var(--main-error-color);
  font-size: 1.25rem;
  font-weight: 800;
  background: var(--main-error-color-gray);
  border-radius: 50%;
}

.error-card {
  justify-content: flex-start;
}

.onboarding-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(340px, 1.1fr);
  gap: 1.25rem;
}

.how-card,
.join-card {
  padding: 1.7rem;
}

.how-card,
.join-card,
.invite-card,
.empty-card {
  cursor: default;
}

.how-card h2,
.join-card h2,
.section-heading h2,
.empty-card h2 {
  margin-top: 0.25rem;
  font-size: 1.35rem;
  font-weight: 700;
}

.steps {
  margin-top: 1.5rem;
}

.step-item {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;

  strong {
    display: block;
    font-size: 0.96rem;
  }

  p {
    margin-top: 0.2rem;
    color: var(--main-font-second-color);
    font-size: 0.85rem;
  }
}

.step-number {
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  place-items: center;
  color: var(--main-color);
  font-size: 0.78rem;
  font-weight: 800;
  background: var(--main-color-bg);
  border: 1px solid var(--main-card-border);
  border-radius: 12px;
}

.step-line {
  width: 1px;
  height: 28px;
  margin: 0.35rem 0 0.35rem 19px;
  background: var(--main-card-border);
}

.form-heading {
  margin-bottom: 1.35rem;

  p {
    margin-top: 0.4rem;
    color: var(--main-font-second-color);
    font-size: 0.88rem;
  }
}

.code-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.88rem;
  font-weight: 650;
}

.code-input {
  width: 100%;
  height: 56px;
  padding: 0 1rem;
  color: var(--main-font-color);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 1.3rem;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  background: var(--main-card-second-background);
  border: 1px solid var(--main-card-border);
  border-radius: 12px;
  outline: none;
  transition: 0.25s ease;
  user-select: text;

  &::placeholder {
    color: var(--main-font-second-color);
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    opacity: 0.45;
  }

  &:focus {
    border-color: var(--main-color);
    box-shadow: 0 0 0 4px var(--main-color-bg);
  }

  &.invalid {
    border-color: var(--main-error-color);
    animation: shake 0.3s ease;
  }
}

.field-hint {
  min-height: 1.4rem;
  margin: 0.45rem 0 0.85rem !important;
  color: var(--main-font-second-color);
  font-size: 0.78rem !important;

  &.error {
    color: var(--main-error-color);
  }
}

.pool-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 42px;
  padding: 0.65rem 1rem;
  color: var(--main-font-color);
  font-size: 0.9rem;
  font-weight: 650;
  background: var(--main-card-second-background);
  border: 1px solid var(--main-card-border);
  border-radius: 11px;
  cursor: pointer;
  transition: 0.22s ease;

  svg {
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover:not(:disabled) {
    color: var(--main-color);
    border-color: var(--main-color);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

  &:focus-visible {
    outline: 3px solid var(--main-color-bg);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &.primary {
    color: #fff;
    background: var(--main-color);
    border-color: var(--main-color);

    &:hover:not(:disabled) {
      color: #fff;
      filter: brightness(1.07);
      box-shadow: 0 8px 18px -7px var(--main-color);
    }
  }

  &.secondary {
    background: var(--main-card-background);
  }

  &.wide {
    width: 100%;
  }

  &.compact {
    min-height: 36px;
    padding: 0.45rem 0.8rem;
  }
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin: 1.9rem 0 1rem;
  padding: 0 0.2rem;
}

.quota-chip {
  padding: 0.45rem 0.75rem;
  color: var(--main-font-second-color);
  font-size: 0.78rem;
  background: var(--main-card-second-background);
  border: 1px solid var(--main-card-border);
  border-radius: 999px;
  white-space: nowrap;
}

.code-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.invite-card {
  padding: 1.2rem;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    opacity 0.25s ease;

  &:hover {
    border-color: var(--main-color);
    transform: translateY(-3px);
  }
}

.card-topline,
.report-status,
.mine-summary,
.mine-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-topline {
  margin-bottom: 0.75rem;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  color: var(--main-success-color);
  font-size: 0.76rem;
  font-weight: 650;

  i {
    width: 7px;
    height: 7px;
    background: currentColor;
    border-radius: 50%;
    box-shadow: 0 0 0 4px var(--main-success-color-gray);
  }
}

.card-time {
  color: var(--main-font-second-color);
  font-size: 0.74rem;
}

.code-value {
  display: block;
  width: 100%;
  padding: 1rem 0.5rem;
  color: var(--main-color);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: clamp(1.25rem, 4vw, 1.65rem);
  font-weight: 750;
  text-align: center;
  letter-spacing: 0.16em;
  background: var(--main-color-bg);
  border: 1px dashed var(--main-color);
  border-radius: 12px;
  cursor: copy;
  transition: 0.25s ease;
  user-select: text;

  &.copied {
    color: var(--main-success-color);
    background: var(--main-success-color-gray);
    border-color: var(--main-success-color);
    border-style: solid;
  }

  &:focus-visible {
    outline: 3px solid var(--main-color-bg);
    outline-offset: 2px;
  }
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.8rem;
}

.report-status {
  margin-top: 0.9rem;
  color: var(--main-font-second-color);
  font-size: 0.75rem;
}

.report-dots {
  display: flex;
  gap: 0.32rem;

  i {
    width: 7px;
    height: 7px;
    background: var(--main-card-border);
    border-radius: 50%;
    transition: background 0.2s ease;

    &.active {
      background: var(--main-error-color);
    }
  }
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1.5rem;
  text-align: center;

  h2,
  p {
    text-align: center;
  }

  p {
    max-width: 480px;
    margin: 0.45rem 0 1.15rem;
    color: var(--main-font-second-color);
    font-size: 0.9rem;
  }
}

.empty-mark {
  display: grid;
  width: 58px;
  height: 58px;
  margin-bottom: 0.8rem;
  place-items: center;
  color: var(--main-color);
  font-size: 1.7rem;
  background: var(--main-color-bg);
  border-radius: 18px;
}

.pool-rule {
  margin: 1rem 0 0 !important;
  color: var(--main-font-second-color);
  font-size: 0.78rem !important;
  text-align: center !important;
}

.action-dock {
  position: sticky;
  z-index: 8;
  bottom: calc(0.8rem + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.25fr);
  gap: 0.25rem;
  width: 100%;
  max-width: 540px;
  box-sizing: border-box;
  margin: 1.5rem auto 0;
  padding: 0.5rem;
  border: 1px solid var(--main-card-border);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgb(0 0 0 / 8%);
  background: var(--main-card-background);
  backdrop-filter: blur(18px);
}

.dock-action {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
  min-height: 56px;
  margin: 0;
  padding: 0.4rem 0.25rem;
  color: var(--main-font-second-color);
  font-size: 0.875rem;
  line-height: 1.3;
  white-space: nowrap;
  font-weight: 650;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 11px;
  cursor: pointer;
  transition: 0.22s ease;

  svg {
    display: block;
    flex: 0 0 20px;
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover:not(:disabled) {
    color: var(--main-color);
    background: var(--main-color-bg);
  }

  &:focus-visible {
    outline: 3px solid var(--main-color-bg);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  &.primary {
    color: #fff;
    background: var(--main-color);

    &:hover {
      color: #fff;
      filter: brightness(1.08);
    }
  }
}

.modal-form {
  .modal-description {
    margin: 0 0 1rem;
    color: var(--main-font-second-color);
    font-size: 0.88rem;
    line-height: 1.65;
  }
}

.quota-box,
.mine-summary {
  margin-bottom: 1rem;
  padding: 0.75rem 0.85rem;
  color: var(--main-font-second-color);
  font-size: 0.8rem;
  background: var(--main-card-second-background);
  border: 1px solid var(--main-card-border);
  border-radius: 11px;

  strong {
    color: var(--main-color);
  }
}

.mine-list {
  display: flex;
  flex-direction: column;
}

.mine-item {
  padding: 0.9rem 0.15rem;
  border-bottom: 1px solid var(--main-card-border);

  &:last-child {
    border-bottom: 0;
  }

  strong {
    display: block;
    font-family: "Fira Code", ui-monospace, monospace;
    font-size: 1rem;
    letter-spacing: 0.1em;
    user-select: text;
  }

  time {
    display: block;
    margin-top: 0.15rem;
    color: var(--main-font-second-color);
    font-size: 0.72rem;
  }
}

.mine-state {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.8rem;
  font-weight: 650;

  &.active {
    color: var(--main-success-color);
  }

  &.retired {
    color: var(--main-error-color);
  }

  small {
    margin-top: 0.15rem;
    color: var(--main-font-second-color);
    font-size: 0.7rem;
    font-weight: 400;
  }
}

.modal-empty {
  padding: 2rem 0;
  color: var(--main-font-second-color);
  font-size: 0.88rem;
  text-align: center;
}

.code-list-enter-active,
.code-list-leave-active {
  transition: 0.3s ease;
}

.code-list-enter-from,
.code-list-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shake {
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

@media (max-width: 760px) {
  .pool-hero {
    align-items: flex-start;
    min-height: auto;
    padding: 1.25rem;
  }

  .game-icon {
    --invite-icon-size: 68px;

    border-radius: 18px;
  }

  .hero-copy h1 {
    font-size: 1.65rem;
  }

  .hero-copy p {
    font-size: 0.88rem;
  }

  .hero-stats {
    display: none;
  }

  .onboarding-layout,
  .code-grid {
    grid-template-columns: 1fr;
  }

  .section-heading {
    align-items: flex-start;
  }

  .action-dock {
    border-radius: 18px;
  }
}

@media (max-width: 480px) {
  .pool-hero {
    margin-inline: -0.2rem;
  }

  .hero-main {
    align-items: flex-start;
    gap: 0.9rem;
  }

  .game-icon {
    --invite-icon-size: 58px;

    border-radius: 15px;
  }

  .hero-copy h1 {
    font-size: 1.45rem;
  }

  .eyebrow {
    font-size: 0.7rem;
  }

  .how-card,
  .join-card,
  .invite-card {
    padding: 1.05rem;
  }

  .section-heading {
    flex-direction: column;
    gap: 0.5rem;
  }

  .quota-chip {
    align-self: flex-start;
  }

  .code-value {
    font-size: 1.25rem;
  }

  .card-actions {
    gap: 0.5rem;
  }

  .pool-button {
    padding-inline: 0.65rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .invite-pool *,
  .invite-pool *::before,
  .invite-pool *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
