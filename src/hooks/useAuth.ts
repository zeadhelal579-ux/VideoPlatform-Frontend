// File: useAuth.ts
// Purpose: The hook every component uses to read who's signed in and to
// log in, register, or log out (ARCHITECTURE.md section 3.1: "owns the
// token in memory, exposes login/logout, and feeds AuthContext").
// Logic/Approach: A thin useContext read over AuthContext — the state
// itself is owned by AuthProvider (context/AuthContext.tsx); this is just
// the sanctioned way any component reaches it, with a clear error if
// something tries to use it outside the provider instead of a silent
// crash on `null`.
import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";

// Reads the auth context (must be used inside AuthProvider).
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
