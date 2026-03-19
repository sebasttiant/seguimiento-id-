import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createAuthService } from "../data/authService.js";

const AuthContext = createContext(null);

const defaultService = createAuthService({
  storage: typeof window === "undefined" ? null : window.sessionStorage,
});

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => defaultService.getCurrentUser());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const user = await defaultService.bootstrap();
      if (!cancelled) {
        setCurrentUser(user);
        setIsInitializing(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      role: currentUser?.role || null,
      isAuthenticated: Boolean(currentUser),
      isInitializing,
      authMode: defaultService.getMode(),
      async login(credentials) {
        const user = await defaultService.login(credentials);
        setCurrentUser(user);
        return user;
      },
      async logout() {
        await defaultService.logout();
        setCurrentUser(null);
      },
      hasRole(allowedRoles) {
        return defaultService.hasRole(currentUser, allowedRoles);
      },
    }),
    [currentUser, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }
  return ctx;
}
