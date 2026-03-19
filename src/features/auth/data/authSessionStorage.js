export const AUTH_STORAGE_KEY = "crm_rnd_auth_session_v2";

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function loadAuthSession(storage) {
  const safeStorage = getStorage(storage);
  if (!safeStorage) return null;

  try {
    const raw = safeStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.user?.id || !parsed?.user?.role) {
      safeStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return {
      user: parsed.user,
      tokens: {
        access: parsed?.tokens?.access || null,
        refresh: parsed?.tokens?.refresh || null,
      },
      source: parsed?.source || "unknown",
      loggedAt: parsed?.loggedAt || null,
    };
  } catch {
    safeStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveAuthSession(session, storage) {
  const safeStorage = getStorage(storage);
  if (!safeStorage) return;

  safeStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user: session?.user || null,
      tokens: {
        access: session?.tokens?.access || null,
        refresh: session?.tokens?.refresh || null,
      },
      source: session?.source || "unknown",
      loggedAt: new Date().toISOString(),
    })
  );
}

export function clearAuthSession(storage) {
  const safeStorage = getStorage(storage);
  safeStorage?.removeItem?.(AUTH_STORAGE_KEY);
}
