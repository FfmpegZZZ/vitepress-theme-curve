import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet, onRequestPost } from "../edge-functions/api/godly-love.js";

const SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
const ENDPOINT = "https://www.wudu.hk/api/godly-love";

test("反馈限制：瞬时并发原子拦截、分钟恢复，不再受六次小时上限影响", async () => {
  const originalNow = Date.now;
  let now = 1_800_000_000_000;
  Date.now = () => now;
  try {
    const store = new MemoryStore();
    const cookie = await startVisitor(store);
    const visitorId = cookie.split("=")[1].split(".")[0];
    const ids = Array.from({ length: 16 }, (_, i) => (i + 1).toString(16).padStart(24, "0"));
    for (const id of ids) {
      const record = { id, code: "TESTCODE", owner: "another-player", createdAt: now };
      await store.setJSON(`codes/${id}.json`, record);
      await store.setJSON(`active/${id.slice(0, 1)}/${id}.json`, record);
      await store.setJSON(`copies/${id}/${visitorId}.json`, { createdAt: now });
    }
    const burst = await Promise.all(
      ids.slice(0, 5).map((id) => post(store, cookie, { action: "vote", id })),
    );
    assert.equal(burst.filter((result) => result.status === 200).length, 2);
    assert.equal(burst.filter((result) => result.status === 429).length, 3);
    const remaining = ids.filter((id) => !store.values.has(`votes/${id}/${visitorId}.json`));
    for (const id of remaining.slice(0, 10)) {
      now += 1000;
      assert.equal((await post(store, cookie, { action: "vote", id })).status, 200);
    }
    now += 1000;
    const blockedId = remaining[10];
    const blocked = await onRequestPost(
      requestContext(store, { method: "POST", cookie, body: { action: "vote", id: blockedId } }),
    );
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("Retry-After")) <= 60);
    now = 1_800_000_060_000;
    assert.equal((await post(store, cookie, { action: "vote", id: blockedId })).status, 200);
  } finally {
    Date.now = originalNow;
  }
});

class MemoryStore {
  constructor() {
    this.values = new Map();
  }

  async set(key, value, options = {}) {
    if (options.onlyIfNew && this.values.has(key)) {
      const error = new Error("already exists");
      error.code = "PRECONDITION_FAILED";
      throw error;
    }
    this.values.set(key, String(value));
  }

  async setJSON(key, value, options = {}) {
    return this.set(key, JSON.stringify(value), options);
  }

  async get(key, options = {}) {
    if (!this.values.has(key)) return null;
    const value = this.values.get(key);
    return options.type === "json" ? JSON.parse(value) : value;
  }

  async delete(key) {
    this.values.delete(key);
  }

  async list(options = {}) {
    const prefix = options.prefix || "";
    const limit = options.limit ?? Number.POSITIVE_INFINITY;
    const blobs = [...this.values.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
      .slice(0, limit)
      .map((key) => ({ key, etag: "test" }));
    return { blobs, directories: [] };
  }
}

class FlakyOwnerStore extends MemoryStore {
  constructor() {
    super();
    this.failed = false;
  }

  async setJSON(key, value, options = {}) {
    if (!this.failed && key.startsWith("owners/")) {
      this.failed = true;
      throw new Error("injected owner index failure");
    }
    return super.setJSON(key, value, options);
  }
}

const requestContext = (store, { method = "GET", cookie = "", body, clientIp = "" } = {}) => {
  const headers = new Headers();
  if (cookie) headers.set("Cookie", cookie);
  if (method === "POST") {
    headers.set("Content-Type", "application/json");
    headers.set("Origin", "https://www.wudu.hk");
  }
  const request = new Request(ENDPOINT, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (clientIp) Object.defineProperty(request, "eo", { value: { clientIp } });
  return {
    request,
    env: {
      INVITE_POOL_SESSION_SECRET: SECRET,
      INVITE_POOL_STORE: store,
    },
    waitUntil: () => {},
  };
};

const readResponse = async (response) => ({
  status: response.status,
  cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  payload: await response.json(),
});

const startVisitor = async (store, clientIp = "") => {
  const result = await readResponse(await onRequestGet(requestContext(store, { clientIp })));
  assert.equal(result.status, 200);
  assert.equal(result.payload.ok, true);
  assert.match(result.cookie, /^godly_love_pool_session=/);
  return result.cookie;
};

const post = async (store, cookie, body, clientIp = "") =>
  readResponse(
    await onRequestPost(
      requestContext(store, {
        method: "POST",
        cookie,
        body,
        clientIp,
      }),
    ),
  );

test("完整互助流程：上传、复制、单人单票和三票下架", async () => {
  const store = new MemoryStore();
  const ownerCookie = await startVisitor(store);
  const ownerUpload = await post(store, ownerCookie, {
    action: "upload",
    code: "ab-cd 1234",
  });

  assert.equal(ownerUpload.status, 201);
  assert.equal(ownerUpload.payload.data.joined, true);
  assert.equal(ownerUpload.payload.data.mine[0].code, "ABCD1234");
  assert.deepEqual(ownerUpload.payload.data.items, []);

  const helperOne = await startVisitor(store);
  const duplicate = await post(store, helperOne, {
    action: "upload",
    code: "ABCD1234",
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.payload.error.code, "CODE_EXISTS");

  const helperUpload = await post(store, helperOne, {
    action: "upload",
    code: "WXYZ5678",
  });
  assert.equal(helperUpload.status, 201);

  const ownerPool = await readResponse(
    await onRequestGet(requestContext(store, { cookie: ownerCookie })),
  );
  const target = ownerPool.payload.data.items.find((item) => item.code === "WXYZ5678");
  assert.ok(target);

  const prematureVote = await post(store, ownerCookie, { action: "vote", id: target.id });
  assert.equal(prematureVote.status, 409);
  assert.equal(prematureVote.payload.error.code, "COPY_REQUIRED");

  assert.equal((await post(store, ownerCookie, { action: "copy", id: target.id })).status, 200);
  const firstVote = await post(store, ownerCookie, { action: "vote", id: target.id });
  assert.equal(firstVote.payload.data.reports, 1);
  assert.equal(firstVote.payload.data.retired, false);

  const duplicateVote = await post(store, ownerCookie, { action: "vote", id: target.id });
  assert.equal(duplicateVote.status, 409);
  assert.equal(duplicateVote.payload.error.code, "ALREADY_REPORTED");

  for (let index = 0; index < 2; index += 1) {
    const helperCookie = await startVisitor(store);
    const helperPool = await readResponse(
      await onRequestGet(requestContext(store, { cookie: helperCookie })),
    );
    const helperTarget = helperPool.payload.data.items.find((item) => item.id === target.id);
    assert.ok(helperTarget);
    assert.equal((await post(store, helperCookie, { action: "copy", id: target.id })).status, 200);
    const vote = await post(store, helperCookie, { action: "vote", id: target.id });
    assert.equal(vote.payload.data.reports, index + 2);
    assert.equal(vote.payload.data.retired, index === 1);
  }

  const lastVisitor = await startVisitor(store);
  const finalPool = await readResponse(
    await onRequestGet(requestContext(store, { cookie: lastVisitor })),
  );
  assert.equal(
    finalPool.payload.data.items.some((item) => item.id === target.id),
    false,
  );

  const retiredRetry = await post(store, helperOne, {
    action: "upload",
    code: "WXYZ5678",
  });
  assert.equal(retiredRetry.status, 409);
  assert.equal(retiredRetry.payload.error.code, "CODE_RETIRED");
});

test("并发上传也不能越过每小时五次", async () => {
  const store = new MemoryStore();
  const cookie = await startVisitor(store);

  const results = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      post(store, cookie, {
        action: "upload",
        code: `RATE${String(index).padStart(4, "0")}`,
      }),
    ),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 201, 201, 201, 201, 429]);
  assert.equal(
    results.find((result) => result.status === 429).payload.error.code,
    "UPLOAD_RATE_LIMITED",
  );
});

test("并发上传同一码只会发布一条记录", async () => {
  const store = new MemoryStore();
  const [visitorOne, visitorTwo] = await Promise.all([startVisitor(store), startVisitor(store)]);
  const results = await Promise.all([
    post(store, visitorOne, { action: "upload", code: "SAME2026" }),
    post(store, visitorTwo, { action: "upload", code: "SAME2026" }),
  ]);

  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  assert.equal([...store.values.keys()].filter((key) => key.startsWith("claims/")).length, 1);
  assert.equal([...store.values.keys()].filter((key) => key.startsWith("active/")).length, 1);
  assert.equal([...store.values.keys()].filter((key) => key.startsWith("codes/")).length, 1);
});

test("claim 后写入中断可由同一上传者幂等续写", async () => {
  const store = new FlakyOwnerStore();
  const cookie = await startVisitor(store);
  const originalConsoleError = console.error;
  console.error = () => {};
  let failed;
  try {
    failed = await post(store, cookie, { action: "upload", code: "RETRY001" });
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(failed.status, 500);
  assert.equal([...store.values.keys()].filter((key) => key.startsWith("claims/")).length, 1);
  assert.equal([...store.values.keys()].filter((key) => key.startsWith("active/")).length, 0);

  const retried = await post(store, cookie, { action: "upload", code: "RETRY001" });
  assert.equal(retried.status, 201);
  assert.equal(retried.payload.data.joined, true);
  assert.equal([...store.values.keys()].filter((key) => key.startsWith("claims/")).length, 1);
  assert.equal([...store.values.keys()].filter((key) => key.startsWith("active/")).length, 1);
  assert.equal([...store.values.keys()].filter((key) => key.startsWith("owners/")).length, 1);
});

test("同一可信 IP 更换会话后仍不能重复反馈同一码", async () => {
  const store = new MemoryStore();
  const owner = await startVisitor(store);
  const upload = await post(store, owner, { action: "upload", code: "IPGUARD1" });
  const target = upload.payload.data.mine[0];
  const clientIp = "203.0.113.9";
  const [visitorOne, visitorTwo] = await Promise.all([
    startVisitor(store, clientIp),
    startVisitor(store, clientIp),
  ]);

  assert.equal(
    (await post(store, visitorOne, { action: "copy", id: target.id }, clientIp)).status,
    200,
  );
  assert.equal(
    (await post(store, visitorTwo, { action: "copy", id: target.id }, clientIp)).status,
    200,
  );
  assert.equal(
    (await post(store, visitorOne, { action: "vote", id: target.id }, clientIp)).status,
    200,
  );
  const duplicate = await post(store, visitorTwo, { action: "vote", id: target.id }, clientIp);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.payload.error.code, "ALREADY_REPORTED");
});

test("按实际字节数拒绝没有 Content-Length 的超大请求", async () => {
  const store = new MemoryStore();
  const cookie = await startVisitor(store);
  const response = await post(store, cookie, {
    action: "upload",
    code: "A".repeat(5000),
  });
  assert.equal(response.status, 413);
  assert.equal(response.payload.error.code, "BODY_TOO_LARGE");
});
