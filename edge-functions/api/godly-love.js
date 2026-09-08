/**
 * 「神明恋爱放送中」邀请码互助池 EdgeOne Function
 *
 * 路由：/api/godly-love
 * 存储：EdgeOne Makers Blob（Store 名称：godly-love-invite-pool）
 * 环境变量：INVITE_POOL_SESSION_SECRET（至少 32 个字符）
 */

import { getStore, PreconditionFailedError } from "@edgeone/pages-blob";

const STORE_NAME = "godly-love-invite-pool";
const SESSION_COOKIE = "godly_love_pool_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;
const HOUR_MS = 60 * 60 * 1000;
const MAX_BODY_BYTES = 4096;
const RATE_RETENTION_HOURS = 24;
const ACTIVE_SAMPLE_SIZE = 48;
const ACTIVE_POOL_CAP = 2000;
const MINE_HISTORY_LIMIT = 100;

const CONFIG = Object.freeze({
  game: "神明恋爱放送中",
  pageSize: 5,
  voteLimit: 3,
  activeOwnCap: 20,
  uploadPerHour: 5,
  // 短窗口配额通过 Blob onlyIfNew 原子占位，约束并发突发，不设小时反馈总额。
  votePerMinute: 12,
  votePerSecond: 2,
  poolCap: ACTIVE_POOL_CAP,
});

class ApiError extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

const textEncoder = new TextEncoder();

const randomHex = (byteLength = 16) => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const bufferToHex = (buffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

const signVisitorId = async (visitorId, secret) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(visitorId));
  return bufferToHex(signature);
};

const safeEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const parseCookies = (request) => {
  const cookies = {};
  const header = request.headers.get("cookie") || "";
  header.split(";").forEach((part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies[name] = value;
  });
  return cookies;
};

const getSessionSecret = (context) => {
  const secret = context.env?.INVITE_POOL_SESSION_SECRET;
  if (typeof secret !== "string" || secret.length < 32) {
    throw new ApiError(503, "SERVICE_NOT_CONFIGURED", "邀请码互助服务尚未完成配置");
  }
  return secret;
};

const getSession = async (context) => {
  const secret = getSessionSecret(context);
  const token = parseCookies(context.request)[SESSION_COOKIE] || "";
  const [candidateId, candidateSignature] = token.split(".");

  if (/^[a-f0-9]{32}$/.test(candidateId || "") && /^[a-f0-9]{64}$/.test(candidateSignature || "")) {
    const expected = await signVisitorId(candidateId, secret);
    if (safeEqual(candidateSignature, expected)) {
      return { visitorId: candidateId, setCookie: null };
    }
  }

  const visitorId = randomHex(16);
  const signature = await signVisitorId(visitorId, secret);
  const secure = new URL(context.request.url).protocol === "https:" ? "; Secure" : "";
  const setCookie = `${SESSION_COOKIE}=${visitorId}.${signature}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
  return { visitorId, setCookie };
};

const getAbuseActorId = async (context, visitorId) => {
  const clientIp = context.request?.eo?.clientIp;
  if (typeof clientIp !== "string" || !clientIp) return visitorId;
  const digest = await signVisitorId(`ip:v1:${clientIp}`, getSessionSecret(context));
  return digest.slice(0, 32);
};

const getInviteStore = (context) => {
  // 测试时可注入内存 Store；线上由 EdgeOne 自动注入 Blob 访问凭据。
  if (context.env?.INVITE_POOL_STORE) return context.env.INVITE_POOL_STORE;
  return getStore({ name: STORE_NAME, consistency: "strong" });
};

const jsonResponse = (payload, { status = 200, setCookie = null, headers = {} } = {}) => {
  const responseHeaders = new Headers({
    "Content-Type": "application/json; charset=UTF-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Cookie",
    ...headers,
  });
  if (setCookie) responseHeaders.set("Set-Cookie", setCookie);
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders });
};

const errorResponse = (error, setCookie = null) => {
  if (error instanceof ApiError) {
    return jsonResponse(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status, setCookie, headers: error.headers },
    );
  }

  return jsonResponse(
    { ok: false, error: { code: "INTERNAL_ERROR", message: "服务暂时不可用，请稍后再试" } },
    { status: 500, setCookie },
  );
};

const logInternalError = (error, context) => {
  if (error instanceof ApiError) return;
  console.error("[godly-love] request failed", {
    name: error?.name || "Error",
    code: error?.code || "UNKNOWN",
    requestId: context.request?.eo?.requestId || context.request?.eo?.uuid || "",
  });
};

const parseJsonBody = async (request) => {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new ApiError(413, "BODY_TOO_LARGE", "请求内容过大");
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "JSON_REQUIRED", "请使用 JSON 格式提交");
  }

  const body = await request.text();
  if (textEncoder.encode(body).byteLength > MAX_BODY_BYTES) {
    throw new ApiError(413, "BODY_TOO_LARGE", "请求内容过大");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "请求内容不是有效的 JSON");
  }
};

const normalizeCode = (value) =>
  String(value || "")
    .replace(/[\s_-]/g, "")
    .toUpperCase();

const requireCode = (value) => {
  const code = normalizeCode(value);
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    throw new ApiError(400, "INVALID_CODE", "推荐码需要是 8 位字母或数字");
  }
  return code;
};

const requireId = (value) => {
  const id = String(value || "");
  if (!/^[a-f0-9]{24}$/.test(id)) {
    throw new ApiError(400, "INVALID_ID", "邀请码标识无效");
  }
  return id;
};

const isConflict = (error) =>
  error instanceof PreconditionFailedError || error?.code === "PRECONDITION_FAILED";

const readJson = (store, key) => store.get(key, { type: "json", consistency: "strong" });

const listKeys = async (store, prefix, limit = 1000) => {
  const result = await store.list({ prefix, limit, consistency: "strong" });
  return (result?.blobs || []).map((blob) => blob.key).filter(Boolean);
};

const claimKey = (code) => `claims/${code}.json`;
const activeKey = (id) => `active/${id.slice(0, 1)}/${id}.json`;
const codeKey = (id) => `codes/${id}.json`;
const ownerKey = (visitorId, createdAt, id) => {
  const reverseTimestamp = String(9_999_999_999_999 - createdAt).padStart(13, "0");
  return `owners/${visitorId}/${reverseTimestamp}-${id}.json`;
};
const copyKey = (id, visitorId) => `copies/${id}/${visitorId}.json`;
const voteKey = (id, actorId) => `votes/${id}/${actorId}.json`;
const votePrefix = (id) => `votes/${id}/`;
const ratePrefix = (kind, actorId, bucket) => `rate/${kind}/${actorId}/${bucket}/`;
const rateKey = (kind, actorId, bucket, slot) => `${ratePrefix(kind, actorId, bucket)}${slot}.json`;

const getReportCount = async (store, id) => {
  const keys = await listKeys(store, votePrefix(id), CONFIG.voteLimit);
  return Math.min(keys.length, CONFIG.voteLimit);
};

const getRateStatus = async (
  store,
  kind,
  actorId,
  limit,
  timestamp = Date.now(),
  windowMs = HOUR_MS,
) => {
  const bucket = Math.floor(timestamp / windowMs);
  const keys = await listKeys(store, ratePrefix(kind, actorId, bucket), limit);
  return {
    left: Math.max(0, limit - keys.length),
    resetIn: Math.max(0, (bucket + 1) * windowMs - timestamp),
  };
};

const cleanOldRateSlots = (store, context, kind, actorId, bucket, limit, windowMs) => {
  const expiredBucket = bucket - Math.ceil((RATE_RETENTION_HOURS * HOUR_MS) / windowMs);
  const cleanup = Promise.all(
    Array.from({ length: limit }, (_, slot) =>
      store.delete(rateKey(kind, actorId, expiredBucket, slot)),
    ),
  ).catch(() => undefined);
  if (typeof context.waitUntil === "function") context.waitUntil(cleanup);
};

const reserveRateSlot = async (store, context, kind, actorId, limit, windowMs = HOUR_MS) => {
  const timestamp = Date.now();
  const bucket = Math.floor(timestamp / windowMs);
  cleanOldRateSlots(store, context, kind, actorId, bucket, limit, windowMs);

  for (let slot = 0; slot < limit; slot += 1) {
    try {
      await store.setJSON(
        rateKey(kind, actorId, bucket, slot),
        { createdAt: timestamp },
        { onlyIfNew: true },
      );
      return;
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  }

  const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * windowMs - timestamp) / 1000));
  if (kind === "upload") {
    throw new ApiError(429, "UPLOAD_RATE_LIMITED", "本小时上传额度已用完", {
      "Retry-After": String(retryAfter),
    });
  }
  throw new ApiError(429, "VOTE_RATE_LIMITED", "反馈太频繁，请稍后再试", {
    "Retry-After": String(retryAfter),
  });
};

const shuffle = (items) => {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const getActiveSnapshot = async (store) => {
  const keys = await listKeys(store, "active/", ACTIVE_POOL_CAP + 1);
  const sampledKeys = shuffle(keys).slice(0, ACTIVE_SAMPLE_SIZE);
  const records = await Promise.all(sampledKeys.map((key) => readJson(store, key)));
  return {
    total: keys.length,
    records: records.filter(
      (record) =>
        record &&
        /^[a-f0-9]{24}$/.test(record.id || "") &&
        /^[A-Z0-9]{8}$/.test(record.code || "") &&
        typeof record.owner === "string" &&
        Number.isFinite(record.createdAt),
    ),
  };
};

const getMyCodes = async (store, visitorId) => {
  const keys = await listKeys(store, `owners/${visitorId}/`, MINE_HISTORY_LIMIT);
  const records = (await Promise.all(keys.map((key) => readJson(store, key))))
    .filter(Boolean)
    .sort((left, right) => right.createdAt - left.createdAt);

  return Promise.all(
    records.map(async (record) => {
      const reports = await getReportCount(store, record.id);
      const active = await readJson(store, activeKey(record.id));
      return {
        id: record.id,
        code: record.code,
        createdAt: record.createdAt,
        reports,
        active: reports < CONFIG.voteLimit && active?.id === record.id,
      };
    }),
  );
};

const getBatch = async (store, visitorId, actorId, activeRecords, excludedIds) => {
  const candidates = activeRecords.filter((record) => record.owner !== visitorId);
  const preferred = shuffle(candidates.filter((record) => !excludedIds.has(record.id)));
  const fallback = shuffle(candidates.filter((record) => excludedIds.has(record.id)));
  const items = [];
  const ordered = [...preferred, ...fallback];

  for (let offset = 0; offset < ordered.length && items.length < CONFIG.pageSize; offset += 8) {
    const candidatesWithState = await Promise.all(
      ordered.slice(offset, offset + 8).map(async (record) => {
        const [reports, copied, voted] = await Promise.all([
          getReportCount(store, record.id),
          store.get(copyKey(record.id, visitorId), { consistency: "strong" }),
          store.get(voteKey(record.id, actorId), { consistency: "strong" }),
        ]);
        if (reports >= CONFIG.voteLimit || voted) return null;
        return {
          id: record.id,
          code: record.code,
          reports,
          copied: Boolean(copied),
          createdAt: record.createdAt,
        };
      }),
    );
    items.push(...candidatesWithState.filter(Boolean).slice(0, CONFIG.pageSize - items.length));
  }

  return items;
};

const createDashboard = async (store, visitorId, actorId, excludedIds = new Set()) => {
  const active = await getActiveSnapshot(store);
  const [batch, mine, uploadQuota, voteQuota] = await Promise.all([
    getBatch(store, visitorId, actorId, active.records, excludedIds),
    getMyCodes(store, visitorId),
    getRateStatus(store, "upload", actorId, CONFIG.uploadPerHour),
    getRateStatus(store, "vote-minute", actorId, CONFIG.votePerMinute, Date.now(), 60_000),
  ]);

  return {
    config: CONFIG,
    items: batch,
    available: active.total,
    mine,
    joined: mine.length > 0,
    quota: { upload: uploadQuota, vote: voteQuota },
  };
};

const releaseActiveRecord = (store, id) => store.delete(activeKey(id));

const reserveCodeClaim = async (store, record) => {
  const key = claimKey(record.code);
  try {
    await store.setJSON(key, record, { onlyIfNew: true });
    return record;
  } catch (error) {
    if (!isConflict(error)) throw error;
  }

  const existing = await readJson(store, key);
  if (existing?.id && existing.owner === record.owner) {
    return existing;
  }
  throw new ApiError(409, "CODE_EXISTS", "这个推荐码已经上传过了");
};

const publishCode = async (store, record) => {
  await store.setJSON(codeKey(record.id), record);
  await store.setJSON(ownerKey(record.owner, record.createdAt, record.id), record);
  // active 是公开可见性的最后一步；前面的索引不完整时不会进入互助池。
  await store.setJSON(activeKey(record.id), record);
};

const uploadCode = async (store, context, visitorId, actorId, rawCode) => {
  const code = requireCode(rawCode);
  const existing = await readJson(store, claimKey(code));

  if (existing?.id) {
    if (existing.owner !== visitorId) {
      throw new ApiError(409, "CODE_EXISTS", "这个推荐码已经上传过了");
    }
    const reports = await getReportCount(store, existing.id);
    if (reports >= CONFIG.voteLimit) {
      throw new ApiError(409, "CODE_RETIRED", "这个推荐码已经下架，不能重复上传");
    }
    await publishCode(store, existing);
    return existing;
  }

  const [active, mine] = await Promise.all([
    getActiveSnapshot(store),
    getMyCodes(store, visitorId),
  ]);
  if (active.total >= ACTIVE_POOL_CAP) {
    throw new ApiError(503, "POOL_FULL", "互助池当前已满，请稍后再试");
  }

  const ownActive = mine.filter((record) => record.active).length;
  if (ownActive >= CONFIG.activeOwnCap) {
    throw new ApiError(
      409,
      "ACTIVE_LIMIT_REACHED",
      `同时展示的推荐码已达到 ${CONFIG.activeOwnCap} 个上限`,
    );
  }
  await reserveRateSlot(store, context, "upload", actorId, CONFIG.uploadPerHour);

  const record = {
    id: randomHex(12),
    code,
    owner: visitorId,
    createdAt: Date.now(),
  };

  const canonicalRecord = await reserveCodeClaim(store, record);
  const reports = await getReportCount(store, canonicalRecord.id);
  if (reports >= CONFIG.voteLimit) {
    throw new ApiError(409, "CODE_RETIRED", "这个推荐码已经下架，不能重复上传");
  }
  await publishCode(store, canonicalRecord);
  return canonicalRecord;
};

const markCopied = async (store, visitorId, rawId) => {
  const id = requireId(rawId);
  const record = await readJson(store, codeKey(id));
  if (!record) throw new ApiError(404, "CODE_NOT_FOUND", "这个推荐码不存在了");
  if (record.owner === visitorId) {
    throw new ApiError(409, "OWN_CODE", "不能使用自己上传的推荐码");
  }

  const active = await readJson(store, activeKey(id));
  const reports = await getReportCount(store, id);
  if (active?.id !== id || reports >= CONFIG.voteLimit) {
    throw new ApiError(409, "CODE_RETIRED", "这个推荐码已经下架了");
  }

  try {
    await store.setJSON(copyKey(id, visitorId), { createdAt: Date.now() }, { onlyIfNew: true });
  } catch (error) {
    if (!isConflict(error)) throw error;
  }
  return { id, copied: true };
};

const reportUsed = async (store, context, visitorId, actorId, rawId) => {
  const id = requireId(rawId);
  const record = await readJson(store, codeKey(id));
  if (!record) throw new ApiError(404, "CODE_NOT_FOUND", "这个推荐码不存在了");
  if (record.owner === visitorId) {
    throw new ApiError(409, "OWN_CODE", "不能反馈自己上传的推荐码");
  }

  const [active, copied, existingVote] = await Promise.all([
    readJson(store, activeKey(id)),
    store.get(copyKey(id, visitorId), { consistency: "strong" }),
    store.get(voteKey(id, actorId), { consistency: "strong" }),
  ]);
  if (active?.id !== id) throw new ApiError(409, "CODE_RETIRED", "这个推荐码已经下架了");
  if (!copied) throw new ApiError(409, "COPY_REQUIRED", "请先复制并尝试填写，再反馈已用完");
  if (existingVote) throw new ApiError(409, "ALREADY_REPORTED", "你已经反馈过这个码了");

  // 先拦截瞬时并发，再占用分钟额度；不同窗口使用独立 key，旧小时额度不再读取。
  await reserveRateSlot(store, context, "vote-second", actorId, CONFIG.votePerSecond, 1000);
  await reserveRateSlot(store, context, "vote-minute", actorId, CONFIG.votePerMinute, 60_000);

  const timestamp = Date.now();
  try {
    await store.setJSON(voteKey(id, actorId), { createdAt: timestamp }, { onlyIfNew: true });
  } catch (error) {
    if (isConflict(error)) throw new ApiError(409, "ALREADY_REPORTED", "你已经反馈过这个码了");
    throw error;
  }

  const reports = await getReportCount(store, id);
  const retired = reports >= CONFIG.voteLimit;
  if (retired) await releaseActiveRecord(store, id);

  const quota = await getRateStatus(
    store,
    "vote-minute",
    actorId,
    CONFIG.votePerMinute,
    Date.now(),
    60_000,
  );
  return { id, reports, retired, quota };
};

const parseExcludedIds = (request) => {
  const raw = new URL(request.url).searchParams.get("exclude") || "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^[a-f0-9]{24}$/.test(id))
      .slice(0, 20),
  );
};

export async function onRequestGet(context) {
  let setCookie = null;
  try {
    const session = await getSession(context);
    setCookie = session.setCookie;
    const actorId = await getAbuseActorId(context, session.visitorId);
    const store = getInviteStore(context);
    const dashboard = await createDashboard(
      store,
      session.visitorId,
      actorId,
      parseExcludedIds(context.request),
    );
    return jsonResponse({ ok: true, data: dashboard }, { setCookie });
  } catch (error) {
    logInternalError(error, context);
    return errorResponse(error, setCookie);
  }
}

export async function onRequestPost(context) {
  let setCookie = null;
  try {
    const session = await getSession(context);
    setCookie = session.setCookie;
    const actorId = await getAbuseActorId(context, session.visitorId);
    const store = getInviteStore(context);
    const body = await parseJsonBody(context.request);

    if (body.action === "upload") {
      await uploadCode(store, context, session.visitorId, actorId, body.code);
      const dashboard = await createDashboard(store, session.visitorId, actorId);
      return jsonResponse({ ok: true, data: dashboard }, { status: 201, setCookie });
    }
    if (body.action === "copy") {
      const result = await markCopied(store, session.visitorId, body.id);
      return jsonResponse({ ok: true, data: result }, { setCookie });
    }
    if (body.action === "vote") {
      const result = await reportUsed(store, context, session.visitorId, actorId, body.id);
      return jsonResponse({ ok: true, data: result }, { setCookie });
    }

    throw new ApiError(400, "UNKNOWN_ACTION", "不支持的操作");
  } catch (error) {
    logInternalError(error, context);
    return errorResponse(error, setCookie);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Cache-Control": "private, no-store",
    },
  });
}
