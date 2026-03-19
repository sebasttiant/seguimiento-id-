import { z } from "zod";

const apiBaseUrlSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^https?:\/\/|^\//, "VITE_API_BASE_URL must be absolute URL or relative path");

const envSchema = z.object({
  VITE_API_BASE_URL: apiBaseUrlSchema.optional(),
  VITE_PROJECT_DATA_SOURCE: z.enum(["local", "api"]).optional(),
  VITE_AUTH_MODE: z.enum(["mock", "api"]).optional(),
  VITE_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
});

const parsed = envSchema.safeParse(import.meta.env);

const fallbackEnv = {
  apiBaseUrl: "http://localhost:8080/api",
  projectDataSource: "api",
  authMode: "api",
  httpTimeoutMs: 10000,
};

export const appEnv = parsed.success
  ? {
      apiBaseUrl: parsed.data.VITE_API_BASE_URL || fallbackEnv.apiBaseUrl,
      projectDataSource: parsed.data.VITE_PROJECT_DATA_SOURCE || fallbackEnv.projectDataSource,
      authMode: parsed.data.VITE_AUTH_MODE || fallbackEnv.authMode,
      httpTimeoutMs: parsed.data.VITE_HTTP_TIMEOUT_MS || fallbackEnv.httpTimeoutMs,
    }
  : fallbackEnv;
