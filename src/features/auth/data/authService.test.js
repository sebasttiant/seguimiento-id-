import { describe, expect, it } from "vitest";
import { createAuthService, hasRequiredRole } from "./authService.js";
import { AUTH_STORAGE_KEY } from "./authSessionStorage.js";

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

const users = [
  {
    id: "u-admin",
    username: "admin",
    role: "admin",
    password: "Admin123!",
  },
  {
    id: "u-viewer",
    username: "viewer",
    role: "viewer",
    password: "Viewer123!",
  },
];

describe("authService", () => {
  it("login exitoso guarda session y retorna usuario", async () => {
    const storage = createStorageMock();
    const service = createAuthService({ storage, users, mode: "mock" });

    const user = await service.login({ identifier: "admin", password: "Admin123!" });

    expect(user.role).toBe("admin");
    expect(service.getCurrentUser()).toEqual(user);
    expect(storage.getItem(AUTH_STORAGE_KEY)).toContain("u-admin");
  });

  it("login falla con credenciales invalidas", async () => {
    const storage = createStorageMock();
    const service = createAuthService({ storage, users, mode: "mock" });

    await expect(service.login({ identifier: "admin", password: "BAD" })).rejects.toThrow(
      "Credenciales invalidas"
    );
  });

  it("hasRequiredRole valida permisos por rol", () => {
    expect(hasRequiredRole("viewer", ["admin", "editor"])).toBe(false);
    expect(hasRequiredRole("admin", ["admin", "editor"])).toBe(true);
  });

  it("login API muestra mensaje amigable para credenciales incorrectas", async () => {
    const storage = createStorageMock();
    const client = {
      post: async () => {
        throw {
          response: {
            status: 401,
            data: { detail: "No active account found with the given credentials" },
          },
        };
      },
    };

    const service = createAuthService({ storage, mode: "api", client });

    await expect(service.login({ identifier: "admin", password: "BAD" })).rejects.toThrow(
      "Credenciales invalidas. Revisa tu usuario y contrasena."
    );
  });

  it("login API muestra mensaje claro para host invalido", async () => {
    const storage = createStorageMock();
    const client = {
      post: async () => {
        throw {
          response: {
            status: 400,
            data: { code: "invalid_host", detail: "Host no permitido por el servidor." },
          },
        };
      },
    };

    const service = createAuthService({ storage, mode: "api", client });

    await expect(service.login({ identifier: "admin", password: "Admin123!" })).rejects.toThrow(
      "No se puede iniciar sesion por configuracion del servidor (host no permitido)."
    );
  });

  it("login API limpia sesion previa y reporta sesion expirada cuando recibe token invalido", async () => {
    const storage = createStorageMock();
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: { id: "u-admin", username: "admin", role: "admin" },
        tokens: { access: "stale-access", refresh: "stale-refresh" },
        source: "api",
      })
    );

    const client = {
      post: async () => {
        throw {
          response: {
            status: 401,
            data: { code: "token_not_valid", detail: "Given token not valid for any token type" },
          },
        };
      },
    };

    const service = createAuthService({ storage, mode: "api", client });

    await expect(service.login({ identifier: "admin", password: "Admin123!" })).rejects.toThrow(
      "Tu sesión expiró. Inicia sesión nuevamente."
    );
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
