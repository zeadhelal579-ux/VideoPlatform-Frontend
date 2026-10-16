// File: DemoBanner.tsx
// Purpose: Thin strip that tells visitors the site is a demo that runs without a server.
// Logic: renders nothing unless the app was built with VITE_DEMO_MODE=true.
import { isDemoMode } from "../../demo/demoMode";

// Shows the demo notice (or nothing in a normal build).
export function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div role="status" className="border-b border-border bg-surface-raised px-6 py-2 text-center text-sm text-ink-muted">
      <span className="font-semibold text-accent">Demo mode</span> — this site runs without a server. Sign in with any e-mail and any password; your data stays in this browser.
    </div>
  );
}
