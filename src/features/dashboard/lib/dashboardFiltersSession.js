const DASHBOARD_FILTERS_PREFIX = "crm_dashboard_filters_v1";

function canUseSessionStorage(storage) {
  if (storage) return true;
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function safeStorage(storage) {
  if (storage) return storage;
  if (!canUseSessionStorage()) return null;
  return window.sessionStorage;
}

function normalizeStatus(value) {
  const valid = new Set(["ALL", "EN_PROCESO", "PENDIENTE", "APROBADO"]);
  return valid.has(value) ? value : "ALL";
}

export function buildDashboardFiltersStorageKey(user) {
  const safeRole = String(user?.role || "anon").toLowerCase();
  const safeUserId = String(user?.id || "guest").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "guest";
  return `${DASHBOARD_FILTERS_PREFIX}:${safeRole}:${safeUserId}`;
}

export function loadDashboardFilters(user, storage) {
  const currentStorage = safeStorage(storage);
  if (!currentStorage) return { q: "", statusFilter: "ALL" };

  try {
    const key = buildDashboardFiltersStorageKey(user);
    const raw = currentStorage.getItem(key);
    if (!raw) return { q: "", statusFilter: "ALL" };
    const parsed = JSON.parse(raw);
    return {
      q: String(parsed?.q || ""),
      statusFilter: normalizeStatus(parsed?.statusFilter),
    };
  } catch {
    return { q: "", statusFilter: "ALL" };
  }
}

export function saveDashboardFilters(user, filters, storage) {
  const currentStorage = safeStorage(storage);
  if (!currentStorage) return;

  const payload = {
    q: String(filters?.q || ""),
    statusFilter: normalizeStatus(filters?.statusFilter),
  };

  try {
    const key = buildDashboardFiltersStorageKey(user);
    currentStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // noop: no bloquear el flujo del dashboard por quota/storage denegado
  }
}
