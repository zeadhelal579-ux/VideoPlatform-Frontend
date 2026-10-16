// File: demoMode.ts
// Purpose: Single switch that tells the app whether it runs as a self-contained demo (no backend).
// Logic: the flag is a build-time Vite variable (VITE_DEMO_MODE=true), so a normal build contains none of the demo code paths.

// True when the app was built with VITE_DEMO_MODE=true.
export const isDemoMode: boolean = import.meta.env.VITE_DEMO_MODE === "true";
