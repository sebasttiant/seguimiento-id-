import { MOCK_USERS } from "./mockUsers.js";
import { httpClient } from "../../../infrastructure/http/httpClient.js";
import { appEnv } from "../../../shared/config/env.js";
import { toErrorMessage } from "../../../shared/lib/errorUtils.js";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "./authSessionStorage.js";

function normalizeIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toSessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export function hasRequiredRole(currentRole, allowedRoles) {
  if (!currentRole) return false;
  return allowedRoles.includes(currentRole);
}

function toApiSessionUser(user) {
  return {
    id: user?.id,
    name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Usuario",
    email: user?.email || "",
    role: user?.role || "viewer",
  };
}

export function createAuthService({ storage, users = MOCK_USERS, mode = appEnv.authMode, client = httpClient } = {}) {
  function loadSession() {
    return loadAuthSession(storage);
  }

  function saveSession(payload) {
    saveAuthSession(payload, storage);
  }

  function clearSession() {
    clearAuthSession(storage);
  }

  return {
    getCurrentUser() {
      return loadSession()?.user || null;
    },

    async bootstrap() {
      const session = loadSession();
      if (!session?.user) return null;

      if (mode === "mock") {
        return session.user;
      }

      try {
        const { data } = await client.get("/auth/me");
        const user = toApiSessionUser(data);
        saveSession({
          ...session,
          user,
          source: "api",
        });
        return user;
      } catch {
        clearSession();
        return null;
      }
    },

    async login({ identifier, password, role } = {}) {
      const normalizedIdentifier = normalizeIdentifier(identifier);
      const normalizedPassword = String(password || "").trim();

      if (!normalizedIdentifier || !normalizedPassword) {
        throw new Error("Debes ingresar usuario o correo, y contraseña.");
      }

      if (mode === "api") {
        try {
          const { data } = await client.post("/auth/login", {
            identifier: normalizedIdentifier,
            password: normalizedPassword,
          });

          const sessionUser = toApiSessionUser(data?.user);
          saveSession({
            user: sessionUser,
            tokens: {
              access: data?.access || null,
              refresh: data?.refresh || null,
            },
            source: "api",
          });
          return sessionUser;
        } catch (error) {
          throw new Error(toErrorMessage(error, "No fue posible autenticar contra el backend."));
        }
      }

      const matchedUser = users.find((candidate) => {
        const byEmail = normalizeIdentifier(candidate.email) === normalizedIdentifier;
        const byUsername = normalizeIdentifier(candidate.username) === normalizedIdentifier;
        return (byEmail || byUsername) && candidate.password === normalizedPassword;
      });

      if (!matchedUser) {
        throw new Error("Credenciales inválidas. Revisa usuario/correo y contraseña.");
      }

      if (role && matchedUser.role !== role) {
        throw new Error("El rol seleccionado no coincide con el usuario.");
      }

      const sessionUser = toSessionUser(matchedUser);
      saveSession({
        user: sessionUser,
        tokens: {
          access: null,
          refresh: null,
        },
        source: "mock",
      });
      return sessionUser;
    },

    async logout() {
      const session = loadSession();
      if (mode === "api" && session?.tokens?.refresh) {
        try {
          await client.post("/auth/logout", { refresh: session.tokens.refresh });
        } catch {
          // noop: se prioriza limpiar sesión localmente para no bloquear UX
        }
      }

      clearSession();
    },

    hasRole(currentUser, allowedRoles) {
      return hasRequiredRole(currentUser?.role, allowedRoles);
    },

    getMode() {
      return mode;
    },
  };
}
