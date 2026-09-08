const API_ENDPOINT = "/api/godly-love";
const REQUEST_TIMEOUT = 12000;

export class InvitePoolApiError extends Error {
  constructor(message, { code = "REQUEST_FAILED", status = 0 } = {}) {
    super(message);
    this.name = "InvitePoolApiError";
    this.code = code;
    this.status = status;
  }
}

const request = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      throw new InvitePoolApiError(
        payload?.error?.message ||
          (response.status === 404 ? "互助服务尚未部署" : "服务暂时不可用"),
        {
          code: payload?.error?.code || "REQUEST_FAILED",
          status: response.status,
        },
      );
    }
    return payload.data;
  } catch (error) {
    if (error instanceof InvitePoolApiError) throw error;
    if (error?.name === "AbortError") {
      throw new InvitePoolApiError("请求超时，请检查网络后重试", { code: "REQUEST_TIMEOUT" });
    }
    throw new InvitePoolApiError("无法连接邀请码互助服务，请稍后再试", {
      code: "NETWORK_ERROR",
    });
  } finally {
    window.clearTimeout(timeout);
  }
};

const mutate = (action, payload = {}) =>
  request(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

export const getInvitePool = (excludedIds = []) => {
  const query = new URLSearchParams();
  if (excludedIds.length) query.set("exclude", excludedIds.join(","));
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return request(`${API_ENDPOINT}${suffix}`);
};

export const uploadInviteCode = (code) => mutate("upload", { code });

export const markInviteCodeCopied = (id) => mutate("copy", { id });

export const reportInviteCodeUsed = (id) => mutate("vote", { id });
