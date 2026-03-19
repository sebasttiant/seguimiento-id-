import { beforeEach, describe, expect, it } from "vitest";
import { AUTH_STORAGE_KEY } from "../../features/auth/data/authSessionStorage.js";
import { httpClient } from "./httpClient.js";

function createStorageMock() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

describe("httpClient auth request interceptor", () => {
  beforeEach(() => {
    global.window = {
      sessionStorage: createStorageMock(),
    };

    window.sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: { id: "u-admin", username: "admin", role: "admin" },
        tokens: { access: "valid-token", refresh: "refresh-token" },
        source: "api",
      })
    );
  });

  it("no adjunta Authorization para /auth/login", async () => {
    const applyInterceptor = httpClient.interceptors.request.handlers[0].fulfilled;
    const config = await applyInterceptor({ url: "/auth/login", headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it("adjunta Authorization para endpoints protegidos", async () => {
    const applyInterceptor = httpClient.interceptors.request.handlers[0].fulfilled;
    const config = await applyInterceptor({ url: "/projects", headers: {} });

    expect(config.headers.Authorization).toBe("Bearer valid-token");
  });
});
