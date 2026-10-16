// File: check-deploy-config.mjs
// Purpose: Fails a Vercel build EARLY, with a readable message, when the app
// has no way to reach the Api — instead of deploying a site whose every
// request silently fails.
// Logic/Approach: The browser can reach the Api in exactly two supported ways
// (see README.md): (A) a same-origin proxy — the "/api/:path*" rewrite in
// vercel.json must point at the real Api host — or (B) a direct address —
// VITE_API_BASE_URL must hold the Api's public HTTPS origin. Exactly one of
// them must be properly configured. The check runs automatically before
// `npm run build` (the npm "prebuild" hook), but only enforces on Vercel
// (the VERCEL env var is set there), so local builds and `npm run dev` are
// never blocked. Escape hatches: SKIP_CONFIG_CHECK=1 (skip), FORCE_CONFIG_CHECK=1 (enforce anywhere).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const enforce = isVercel || process.env.FORCE_CONFIG_CHECK === "1";

// Collects human-readable problems; an empty list means the config is usable.
export function findProblems({ apiBaseUrl, vercelConfig, demoMode = false }) {
  // Demo mode (VITE_DEMO_MODE=true) runs a fake Api inside the browser, so no real API address is needed.
  if (demoMode) return [];
  const problems = [];
  const base = (apiBaseUrl ?? "").trim();

  if (base) {
    // ---- Mode B: direct to the Api ----
    let url = null;
    try {
      url = new URL(base);
    } catch {
      problems.push(`VITE_API_BASE_URL="${base}" is not a valid URL. Use the full origin, e.g. https://api.example.com`);
    }
    if (url) {
      const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol !== "https:" && !isLocal) {
        problems.push(
          `VITE_API_BASE_URL must start with https:// (got "${base}"). A Vercel site is served over HTTPS, and browsers block calls from it to a plain-http API (mixed content).`,
        );
      }
      if (/\/api\/?$/i.test(url.pathname)) {
        problems.push(
          `VITE_API_BASE_URL must not end with /api (got "${base}"). The app already adds "/api/..." itself — use just the origin, e.g. ${url.origin}`,
        );
      }
    }
    return problems;
  }

  // ---- Mode A: same-origin proxy through the vercel.json rewrite ----
  const rewrite = (vercelConfig?.rewrites ?? []).find((r) => typeof r.source === "string" && r.source.startsWith("/api/"));
  if (!rewrite) {
    problems.push('vercel.json has no rewrite with source "/api/:path*", and VITE_API_BASE_URL is empty — the app cannot reach the Api.');
    return problems;
  }

  let destination = null;
  try {
    destination = new URL(String(rewrite.destination).replace(":path*", "x"));
  } catch {
    problems.push(`The "/api/:path*" rewrite destination "${rewrite.destination}" is not a valid URL.`);
    return problems;
  }
  if (destination.hostname.endsWith(".invalid") || /REPLACE/i.test(destination.hostname)) {
    problems.push(
      'The "/api/:path*" rewrite in vercel.json still points at the placeholder host. Replace REPLACE-WITH-YOUR-API-HOST.invalid with your Api\'s real HTTPS host — OR set the VITE_API_BASE_URL environment variable in Vercel (Project Settings -> Environment Variables).',
    );
  } else if (destination.protocol !== "https:") {
    problems.push(`The "/api/:path*" rewrite destination must be https:// (got "${rewrite.destination}").`);
  }
  return problems;
}

// Reads VITE_DEMO_MODE the way Vite does: the process environment first, then the .env files (most specific first).
function readDemoFlag() {
  if (process.env.VITE_DEMO_MODE !== undefined) return process.env.VITE_DEMO_MODE.trim() === "true";
  for (const name of [".env.production.local", ".env.production", ".env.local", ".env"]) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const match = /^\s*VITE_DEMO_MODE\s*=\s*(\S*)\s*$/m.exec(fs.readFileSync(file, "utf8"));
    if (match) return match[1].replace(/^["']|["']$/g, "") === "true";
  }
  return false;
}

// CLI entry: reads the configuration, prints the problems and returns the process exit code.
function main() {
  if (process.env.SKIP_CONFIG_CHECK === "1") {
    console.log("[check-config] skipped (SKIP_CONFIG_CHECK=1).");
    return 0;
  }

  const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const demoMode = readDemoFlag();
  const problems = findProblems({ apiBaseUrl: process.env.VITE_API_BASE_URL, vercelConfig, demoMode });

  if (problems.length === 0) {
    const mode = demoMode ? "DEMO (in-browser fake Api, no backend needed)" : (process.env.VITE_API_BASE_URL ?? "").trim() ? "direct (VITE_API_BASE_URL)" : "same-origin proxy (vercel.json rewrite)";
    console.log(`[check-config] OK — API access mode: ${mode}.`);
    return 0;
  }

  const header = enforce ? "[check-config] DEPLOY BLOCKED — the API address is not configured correctly:" : "[check-config] Warning (not enforced outside Vercel):";
  console.error(`\n${header}`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("  See README.md, section \"Choose how the browser reaches the Api\".\n");
  return enforce ? 1 : 0;
}

// Run only when executed directly (so tests can import findProblems).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
