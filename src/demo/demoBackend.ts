// File: demoBackend.ts
// Purpose: A tiny fake Api that lives INSIDE the browser so the site can be shown to a client without any server.
// Logic: it replaces window.fetch for "/api/..." requests and XMLHttpRequest for the fake storage upload URL, keeps
//        users and videos in localStorage, and derives a video's status from the time since "confirm"
//        (Queued -> Processing -> Ready). Request/response shapes mirror the real Api, so the UI code is untouched.
import { isSupportedVideoFile, UNSUPPORTED_FILE_MESSAGE } from "../utils/videoFiles";

const STORE_KEY = "vp.demo.v1";
const SESSION_KEY = "vp.demo.session";
const UPLOAD_PREFIX = "/__demo/upload/";
// Public adaptive-bitrate test stream (Big Buck Bunny). Override with VITE_DEMO_HLS_URL to use your own HLS URL.
const DEMO_HLS_URL: string = import.meta.env.VITE_DEMO_HLS_URL || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
// VITE_DEMO_SPEED > 1 shortens the fake processing time (used by the automated tests).
const SPEED = Math.max(1, Number(import.meta.env.VITE_DEMO_SPEED) || 1);
const QUEUED_MS = 3000 / SPEED;
const PROCESSING_MS = 9000 / SPEED;
const FAILED_MESSAGE = "We could not process this video. Please try uploading it again.";

interface DemoUser { id: string; email: string; displayName: string }
interface DemoVideo { id: string; ownerId: string; title: string; createdAt: string; confirmedAt: number | null; fixed: "Ready" | "Failed" | null }
interface DemoState { users: DemoUser[]; videos: DemoVideo[] }

let installed = false;
const liveTokens = new Map<string, string>();

// Creates a random id (crypto.randomUUID needs a secure context, so fall back for plain http).
function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

// Reads the demo database from localStorage (empty when missing or unreadable).
function loadState(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {
    /* storage blocked or corrupt: start empty */
  }
  return { users: [], videos: [] };
}

// Writes the demo database back (ignored when storage is blocked).
function saveState(state: DemoState): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: the demo keeps working for this page view only */
  }
}

// Encodes JSON as base64url (UTF-8 safe) for the fake JWT.
function b64url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Issues a JWT-shaped token (the UI only reads sub and email from it) and remembers it as valid.
function issueToken(user: DemoUser): { accessToken: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + 1800;
  const token = `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub: user.id, email: user.email, exp })}.demo`;
  liveTokens.set(token, user.id);
  return { accessToken: token, expiresAt: new Date(exp * 1000).toISOString() };
}

// Gives every new demo account a few finished videos so the dashboard is not empty.
function seedVideos(state: DemoState, ownerId: string): void {
  const day = 86_400_000;
  const samples: [string, "Ready" | "Failed", number][] = [["Product tour", "Ready", 1], ["Quarterly all-hands", "Ready", 3], ["Conference keynote", "Ready", 6], ["Corrupted clip", "Failed", 8]];
  for (const [title, fixed, daysAgo] of samples) {
    state.videos.push({ id: newId(), ownerId, title, createdAt: new Date(Date.now() - daysAgo * day).toISOString(), confirmedAt: null, fixed });
  }
}

// Finds or creates the demo user for an e-mail address.
function ensureUser(state: DemoState, email: string, displayName: string): DemoUser {
  let user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = { id: newId(), email, displayName };
    state.users.push(user);
    seedVideos(state, user.id);
  }
  return user;
}

// Computes the current status of a video from the time since it was confirmed.
function statusOf(video: DemoVideo): "Pending" | "Queued" | "Processing" | "Ready" | "Failed" {
  if (video.fixed) return video.fixed;
  if (video.confirmedAt === null) return "Pending";
  const elapsed = Date.now() - video.confirmedAt;
  if (elapsed < QUEUED_MS) return "Queued";
  return elapsed < QUEUED_MS + PROCESSING_MS ? "Processing" : "Ready";
}

// Converts a stored video into the JSON the real Api returns.
function toDto(video: DemoVideo) {
  const status = statusOf(video);
  return {
    id: video.id, title: video.title, status,
    masterPlaylistUrl: status === "Ready" ? DEMO_HLS_URL : null,
    thumbnailUrl: null, errorMessage: status === "Failed" ? FAILED_MESSAGE : null, createdAt: video.createdAt,
  };
}

// Builds a JSON response (or an empty one when body is undefined).
function reply(status: number, body?: unknown, contentType = "application/json"): Response {
  return body === undefined ? new Response(null, { status }) : new Response(JSON.stringify(body), { status, headers: { "Content-Type": contentType } });
}

// Waits a little so loading states are visible like with a real server.
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// Handles POST /api/auth/register with the same validation messages as the real Api.
function register(state: DemoState, body: Record<string, string>): Response {
  const errors: Record<string, string[]> = {};
  const email = (body.email ?? "").trim(); const password = body.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.InvalidEmail = ["Email is invalid."];
  if (password.length < 8) errors.PasswordTooShort = ["Passwords must be at least 8 characters."];
  if (!/\d/.test(password)) errors.PasswordRequiresDigit = ["Passwords must have at least one digit ('0'-'9')."];
  if (!/[A-Z]/.test(password)) errors.PasswordRequiresUpper = ["Passwords must have at least one uppercase ('A'-'Z')."];
  if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) errors.DuplicateUserName = ["Email is already taken."];
  if (Object.keys(errors).length > 0) return reply(400, { title: "One or more validation errors occurred.", status: 400, errors }, "application/problem+json");
  const user = ensureUser(state, email, (body.displayName ?? "").trim() || email);
  return reply(201, { id: user.id, email: user.email });
}

// Routes one API call. Returns a Response exactly like the real server would.
async function route(method: string, url: URL, headers: Headers, rawBody: unknown): Promise<Response> {
  await delay(120);
  const state = loadState(); const path = url.pathname;
  let body: Record<string, string> = {};
  if (typeof rawBody === "string" && rawBody) { try { body = JSON.parse(rawBody) as Record<string, string>; } catch { return reply(400, "Invalid JSON."); } }

  if (method === "POST" && path === "/api/auth/register") { const r = register(state, body); saveState(state); return r; }
  if (method === "POST" && path === "/api/auth/login") {
    const email = (body.email ?? "").trim();
    if (!email || !body.password) return reply(401);
    const user = ensureUser(state, email, email); saveState(state);
    window.localStorage.setItem(SESSION_KEY, user.id);
    return reply(200, issueToken(user));
  }
  if (method === "POST" && path === "/api/auth/refresh") {
    const user = state.users.find((u) => u.id === window.localStorage.getItem(SESSION_KEY));
    return user ? reply(200, issueToken(user)) : reply(401);
  }
  if (method === "POST" && path === "/api/auth/logout") { window.localStorage.removeItem(SESSION_KEY); return reply(204); }

  const auth = headers.get("Authorization") ?? "";
  const userId = auth.startsWith("Bearer ") ? liveTokens.get(auth.slice(7)) : undefined;
  if (!userId) return reply(401);
  const mine = state.videos.filter((v) => v.ownerId === userId);

  if (method === "POST" && path === "/api/videos/upload-url") {
    const title = (body.title ?? "").trim(); const fileName = body.fileName ?? "";
    if (!title) return reply(400, "Title is required.");
    if (title.length > 200) return reply(400, "Title must be at most 200 characters.");
    if (!isSupportedVideoFile({ name: fileName })) return reply(400, UNSUPPORTED_FILE_MESSAGE);
    const video: DemoVideo = { id: newId(), ownerId: userId, title, createdAt: new Date().toISOString(), confirmedAt: null, fixed: null };
    state.videos.push(video); saveState(state);
    return reply(200, { videoId: video.id, uploadUrl: `${UPLOAD_PREFIX}${video.id}` });
  }
  const confirm = /^\/api\/videos\/([\w-]+)\/confirm$/.exec(path);
  if (method === "POST" && confirm) {
    const video = mine.find((v) => v.id === confirm[1]);
    if (!video) return reply(400, "Video not found.");
    if (video.confirmedAt !== null || video.fixed) return reply(400, "This upload was already confirmed.");
    video.confirmedAt = Date.now(); saveState(state);
    return reply(204);
  }
  const one = /^\/api\/videos\/([\w-]+)$/.exec(path);
  if (method === "GET" && one) { const video = mine.find((v) => v.id === one[1]); return video ? reply(200, toDto(video)) : reply(404); }
  if (method === "GET" && path === "/api/videos") {
    const page = Number(url.searchParams.get("page") ?? 1); const size = Number(url.searchParams.get("pageSize") ?? 20);
    if (!(page >= 1)) return reply(400, "Page must be 1 or greater.");
    if (!(size >= 1 && size <= 100)) return reply(400, "Page size must be between 1 and 100.");
    const sorted = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return reply(200, { items: sorted.slice((page - 1) * size, page * size).map(toDto), totalCount: sorted.length, page, pageSize: size });
  }
  return reply(404);
}

// Replaces XMLHttpRequest so that "uploading" to the fake storage URL just animates progress.
function patchUploads(): void {
  const RealXhr = window.XMLHttpRequest;
  class DemoAwareXhr extends RealXhr {
    private demoUpload = false;

    // Opens a real request, or marks this one as a fake upload.
    override open(method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null): void {
      this.demoUpload = String(url).startsWith(UPLOAD_PREFIX);
      if (!this.demoUpload) super.open(method, url, async ?? true, user, password);
    }

    // Ignores headers for fake uploads (a real XHR would throw because it was never opened).
    override setRequestHeader(name: string, value: string): void {
      if (!this.demoUpload) super.setRequestHeader(name, value);
    }

    // Sends for real, or plays a short progress animation and then reports success.
    override send(body?: Document | XMLHttpRequestBodyInit | null): void {
      if (!this.demoUpload) { super.send(body); return; }
      const total = body instanceof Blob ? body.size : 1;
      const steps = 8;
      let step = 0;
      const timer = window.setInterval(() => {
        step += 1;
        this.upload.onprogress?.call(this, { lengthComputable: true, loaded: Math.round((total * step) / steps), total } as ProgressEvent);
        if (step >= steps) {
          window.clearInterval(timer);
          Object.defineProperty(this, "status", { value: 200, configurable: true });
          this.onload?.({} as ProgressEvent);
        }
      }, 180 / SPEED);
    }
  }
  window.XMLHttpRequest = DemoAwareXhr;
}

// Turns the demo backend on. Safe to call more than once.
export function installDemoBackend(): void {
  if (installed) return;
  installed = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, window.location.href);
    if (!url.pathname.startsWith("/api/")) return realFetch(input, init);
    return route((init?.method ?? "GET").toUpperCase(), url, new Headers(init?.headers), init?.body);
  };
  patchUploads();
}
