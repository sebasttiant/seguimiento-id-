import { describe, expect, it } from "vitest";
import {
  buildDashboardFiltersStorageKey,
  loadDashboardFilters,
  saveDashboardFilters,
} from "./dashboardFiltersSession.js";

function createStorageMock() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

describe("dashboardFiltersSession", () => {
  it("persist and restore filters per role and user", () => {
    const storage = createStorageMock();
    const admin = { id: "u-1", role: "admin" };
    const viewer = { id: "u-2", role: "viewer" };

    saveDashboardFilters(admin, { q: "acme", statusFilter: "APROBADO" }, storage);
    saveDashboardFilters(viewer, { q: "beta", statusFilter: "PENDIENTE" }, storage);

    expect(loadDashboardFilters(admin, storage)).toEqual({ q: "acme", statusFilter: "APROBADO" });
    expect(loadDashboardFilters(viewer, storage)).toEqual({ q: "beta", statusFilter: "PENDIENTE" });
  });

  it("falls back to defaults with malformed storage values", () => {
    const storage = createStorageMock();
    const user = { id: "u-3", role: "editor" };
    const key = buildDashboardFiltersStorageKey(user);
    storage.setItem(key, "{bad-json");

    expect(loadDashboardFilters(user, storage)).toEqual({ q: "", statusFilter: "ALL" });
  });

  it("does not include email in storage key", () => {
    const user = { id: "abc-123", username: "admin", role: "admin" };
    expect(buildDashboardFiltersStorageKey(user)).toBe("crm_dashboard_filters_v1:admin:abc-123");
  });
});
