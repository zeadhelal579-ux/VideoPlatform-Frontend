// File: main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installChunkReloadRecovery } from "./utils/chunkRecovery";

installChunkReloadRecovery();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root was not found in index.html.");
}

// Starts the app; in demo mode the in-browser fake Api is installed first (and its code is only loaded then).
async function start(rootNode: HTMLElement): Promise<void> {
  // Written inline (not via a shared constant) so the bundler can fold it and drop the demo chunk from normal builds.
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const { installDemoBackend } = await import("./demo/demoBackend");
    installDemoBackend();
  }
  createRoot(rootNode).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start(rootElement);
