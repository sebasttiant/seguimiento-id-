import axios from "axios";
import { appEnv } from "../../shared/config/env.js";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "../../features/auth/data/authSessionStorage.js";

export const httpClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  timeout: appEnv.httpTimeoutMs,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  timeout: appEnv.httpTimeoutMs,
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use((config) => {
  const isAuthEndpoint = String(config?.url || "").includes("/auth/");
  if (isAuthEndpoint) {
    return config;
  }

  const session = loadAuthSession();
  if (!session?.tokens?.access) {
    return config;
  }

  const headers = config.headers || {};
  if (!headers.Authorization) {
    headers.Authorization = `Bearer ${session.tokens.access}`;
  }

  return {
    ...config,
    headers,
  };
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const isAuthEndpoint = String(originalRequest?.url || "").includes("/auth/");

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      throw error;
    }

    const currentSession = loadAuthSession();
    const refresh = currentSession?.tokens?.refresh;

    if (!refresh) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      const { data } = await refreshClient.post("/auth/refresh", { refresh });
      const nextSession = {
        ...currentSession,
        tokens: {
          access: data?.access || null,
          refresh: data?.refresh || refresh,
        },
      };

      if (!nextSession?.tokens?.access) {
        clearAuthSession();
        throw error;
      }

      saveAuthSession(nextSession);
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${nextSession.tokens.access}`,
      };
      return httpClient.request(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      throw refreshError;
    }
  }
);
