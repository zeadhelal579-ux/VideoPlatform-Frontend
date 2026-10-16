// File: AuthContext.tsx
// Purpose: Makes the current user and auth actions available anywhere in
// the tree without prop-drilling (ARCHITECTURE.md section 3.1).
// Logic/Approach: Owns no token state of its own — api/client.ts's module-
// level store is the single source of truth (kept in memory only, per
// FLOW.md step 7) — this just subscribes to it and mirrors it into React
// state so components re-render when it changes, including when a 401
// somewhere else in the app triggers a silent background refresh
// (api/client.ts's apiFetch). On mount, it also attempts exactly one
// silent bootstrap refresh: the access token itself never survives a page
// reload by design, but the httpOnly refresh cookie might still be valid,
// and without this a returning user would be bounced to LoginPage every
// time they refreshed the page.
import { createContext, useEffect, useState, type ReactNode } from "react";
import { bootstrapSession, getAccessToken, subscribeToAccessToken } from "../api/client";
import { login as loginRequest, register as registerRequest, logout as logoutRequest } from "../api/auth";
import { decodeAccessToken } from "../utils/jwt";
import type { AuthUser } from "../types/user";

export interface AuthContextValue {
  user: AuthUser | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Provides auth state to the tree and restores the session on start-up.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getAccessToken();
    return token ? decodeAccessToken(token) : null;
  });
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAccessToken((token) => {
      setUser(token ? decodeAccessToken(token) : null);
    });

    bootstrapSession().finally(() => setIsInitializing(false));

    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    isInitializing,
    login: loginRequest,
    register: registerRequest,
    logout: logoutRequest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
