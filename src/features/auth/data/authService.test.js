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
    name: "Admin",
    email: "admin@crm.local",
    username: "admin",
    role: "admin",
    password: "Admin123!",
  },
  {
    id: "u-viewer",
    name: "Viewer",
    email: "viewer@crm.local",
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
      "Credenciales inválidas"
    );
  });

  it("hasRequiredRole valida permisos por rol", () => {
    expect(hasRequiredRole("viewer", ["admin", "editor"])).toBe(false);
    expect(hasRequiredRole("admin", ["admin", "editor"])).toBe(true);
  });
});
