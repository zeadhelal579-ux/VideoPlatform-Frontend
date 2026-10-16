// File: client.ts
// Purpose: The one place that knows an HTTP API exists (ARCHITECTURE.md
// section 3.1). Owns the in-memory access token, attaches it to every
// request, and implements the silent-refresh-then-retry-once flow FLOW.md
// step 12 describes.
// Logic/Approach: The access token lives in a plain module variable, never
// localStorage (FLOW.md step 7 — reduces exposure to XSS). It is plain
// module state rather than React state so this file has no React
// dependency; AuthContext.tsx subscribes to it via subscribeToAccessToken
// to stay in sync for rendering. `credentials: "include"` is required on
// every call: whenever the Api is a different origin from this app (local
// development, or a direct-to-Api production setup), fetch does not send or
// store cookies cross-origin unless told to — without this, the httpOnly
// refresh cookie would never be sent or set, silently breaking the whole
// refresh flow.
//
// Where the Api lives — three supported shapes, all driven by VITE_API_BASE_URL:
//   1. Development: the Api runs on localhost:5000, a different origin from
//      Vite's 5173 — the default below.
//   2. Same origin: the host proxies /api to the Api (the rewrite in
//      vercel.json, or nginx) — leave VITE_API_BASE_URL empty and every URL
//      stays relative ("/api/videos"). The browser then sees one origin, so
//      there is no CORS and the refresh cookie is first-party everywhere.
//   3. Direct: the browser calls the Api's own HTTPS address, e.g.
//      VITE_API_BASE_URL=https://api.example.com — the Api must then allow
//      this site's origin in CORS (Frontend:Origin) and the refresh cookie
//      must be same-site (a sibling subdomain) or SameSite=None.
const configuredBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (configuredBaseUrl ?? (import.meta.env.DEV ? "http://localhost:5000" : "")).replace(/\/+$/, "");

// Sent on every call. The Api only *requires* it when the refresh cookie is
// SameSite=None (cross-site deployments): a custom header cannot ride on a
// cross-site request without a CORS preflight, and only the allowed frontend
// origins pass that — so a hostile page cannot make a victim's browser call
// /refresh or /logout with their cookie attached.
const CSRF_HEADER_NAME = "X-Requested-With";
const CSRF_HEADER_VALUE = "XMLHttpRequest";

// ---- "Is there probably a session?" hint ----
// The refresh token is an httpOnly cookie the page cannot see. Without a
// hint, every anonymous visitor would fire a POST /api/auth/refresh that is
// guaranteed to answer 401 (a red line in the console and a wasted request).
// A harmless flag in localStorage records "this browser signed in before".
// It carries no secret — the cookie stays the only credential — and a stale
// flag only costs one failed refresh, after which it is cleared.
const SESSION_HINT_KEY = "vp.hasSession";

// True when this browser has signed in before, so a silent refresh is worth trying.
function shouldTryBootstrap(): boolean {
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    // Storage is blocked: we cannot tell, so just try (the refresh is cheap).
    return true;
  }
}

// Stores a non-secret hint that this browser has a session.
function rememberSession(): void {
  try {
    window.localStorage.setItem(SESSION_HINT_KEY, "1");
  } catch {
    // Storage unavailable (e.g. blocked site data) — the hint is optional.
  }
}

// Removes that hint.
function forgetSession(): void {
  try {
    window.localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Same as above.
  }
}

// ---- In-memory access token store ----

let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

// Returns the in-memory access token (or null).
export function getAccessToken(): string | null {
  return accessToken;
}

// Stores the token in memory and notifies subscribers.
export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token !== null) rememberSession();
  listeners.forEach((listener) => listener(token));
}

// Ends the session on purpose (log out) or because the server rejected the
// refresh cookie for good: forget the hint as well as the in-memory token.
export function clearSession(): void {
  forgetSession();
  setAccessToken(null);
}

// Lets AuthContext mirror this module's token into React state without
// this file importing React. Returns an unsubscribe function.
export function subscribeToAccessToken(listener: (token: string | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---- Errors ----

export const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your connection and try again.";
export const UNEXPECTED_RESPONSE_MESSAGE =
  "The server sent an unexpected response. If you run this site, check the API address configuration.";

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// Failures worth retrying on their own: the server could not be reached
// (status 0), is rate limiting (429), or hit a 5xx. Everything else (404,
// 400, a 401 that survived a refresh, ...) will not fix itself.
export function isTransientError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500);
}

// fetch() rejects with an opaque TypeError on any network failure; turn that
// into the same ApiError type every other failure uses, so callers show one
// consistent, readable message instead of "Failed to fetch".
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }
}

// ---- Silent refresh, deduplicated ----
// If several requests 401 around the same time, they must all wait on the
// SAME refresh call rather than each firing their own — a stampede of
// concurrent /refresh calls would rotate the refresh token out from under
// each other (AuthEndpoints.cs revokes-and-replaces on every use).

let refreshInFlight: Promise<boolean> | null = null;

// Shares one refresh request between all concurrent callers.
function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// Calls POST /api/auth/refresh using the httpOnly cookie.
async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
    });

    if (!response.ok) {
      // 401/403: the cookie is missing, expired or revoked — the session is
      // really over, so forget the hint. Anything else (429, 5xx) may be
      // temporary: keep the hint so the next page load tries again.
      if (response.status === 401 || response.status === 403) {
        clearSession();
      } else {
        setAccessToken(null);
      }
      return false;
    }

    const data = (await response.json()) as { accessToken?: unknown };
    if (typeof data.accessToken !== "string") throw new Error("Malformed refresh response.");
    setAccessToken(data.accessToken);
    return true;
  } catch {
    // Network failure or an unreadable body: not signed in right now, but
    // not proof the cookie is bad either — keep the hint.
    setAccessToken(null);
    return false;
  }
}

// Attempts a silent sign-in from the httpOnly refresh cookie, if the
// browser still has a valid one from an earlier visit. Called once, on
// app load, by AuthContext — this is what lets a page reload keep someone
// signed in even though the access token itself lives only in memory.
// Skipped entirely (no request at all) for a browser that never signed in.
export function bootstrapSession(): Promise<boolean> {
  if (!shouldTryBootstrap()) return Promise.resolve(false);
  return refreshAccessToken();
}

// ---- Core request wrapper ----

function buildRequest(path: string, options: RequestInit): [string, RequestInit] {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  headers.set(CSRF_HEADER_NAME, CSRF_HEADER_VALUE);

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return [
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
      credentials: "include",
    },
  ];
}

// FLOW.md step 12, implemented literally: watch every response; on 401,
// silently refresh, then retry the original request once, transparently.
// Auth endpoints are excluded on purpose — a wrong password on /login is a
// meaningful 401 the caller must see as-is, not a trigger to refresh a
// session that was never established.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const [url, init] = buildRequest(path, options);
  let response = await safeFetch(url, init);

  const isAuthEndpoint = path.startsWith("/api/auth/");
  if (response.status === 401 && !isAuthEndpoint) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const [retryUrl, retryInit] = buildRequest(path, options);
      response = await safeFetch(retryUrl, retryInit);
    }
  }

  return response;
}

// ---- Response parsing, shared by api/auth.ts and api/videos.ts ----

function isJsonResponse(response: Response): boolean {
  return (response.headers.get("Content-Type") ?? "").toLowerCase().includes("json");
}

// Reads a response body without ever throwing.
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// The Videos endpoints (VideoEndpoints.cs) fail with a bare JSON string —
// `TypedResults.BadRequest(result.Error)`, and Result.Error is a plain
// string (Domain/Common/Result.cs) — not `{ message: ... }`. Login/Refresh
// fail with an empty 401 body. This covers both: use the string body
// verbatim when there is one, otherwise fall back to a generic message.
// Only a JSON body is trusted as a message: an HTML error page from a proxy
// or CDN (a 502, a 404) must never be shown to a person as text.
export async function throwIfNotOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) return;

  const body = await readBody(response);
  const isApiMessage = isJsonResponse(response) && typeof body === "string" && body.length > 0;
  throw new ApiError(isApiMessage ? body : fallbackMessage, response.status, body);
}

// A success response that is not JSON means the request never reached the
// Api — typically the host's SPA fallback answered with index.html because
// the API address is missing or wrong. Fail loudly with a clear message
// instead of letting `undefined` flow on as if it were data.
export async function parseJson<T>(response: Response): Promise<T> {
  if (!isJsonResponse(response)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, response.status);
  }
  return (await readBody(response)) as T;
}
