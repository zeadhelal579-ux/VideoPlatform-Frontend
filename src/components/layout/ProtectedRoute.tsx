// File: ProtectedRoute.tsx
// Purpose: Not in ARCHITECTURE.md's file list, but necessary: every /api/videos/*
// route requires authorization (VideoEndpoints.cs, .RequireAuthorization()
// on the whole group), so Dashboard/Upload/Watch need something to send a
// signed-out visitor to LoginPage instead of a route that will just 401.
// Logic/Approach: Waits for AuthContext's one-time bootstrap refresh
// (AuthContext.tsx) before deciding — otherwise a signed-in user reloading
// the page would flash to LoginPage for the instant before that silent
// refresh resolves.
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Spinner } from "../ui/Spinner";

// Redirects anonymous visitors to /login and remembers where they wanted to go.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} className="text-ink-faint" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
