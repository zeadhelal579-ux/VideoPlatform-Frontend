// File: auth.ts
// Purpose: login(), register(), logout() (ARCHITECTURE.md section 3.1) —
// one typed function per AuthEndpoints.cs route.
// Logic/Approach: The two failure shapes AuthEndpoints.cs actually
// produces are handled separately, deliberately not through the shared
// throwIfNotOk in client.ts (that one is for the Videos endpoints' bare-
// string errors): Login/Refresh answer a wrong attempt with an empty 401
// body (TypedResults.Unauthorized(), no message — the point is to never
// reveal *why* a login failed), while Register answers with ASP.NET's
// ValidationProblem shape (`{ errors: { [code]: string[] }, title, ... }`,
// from TypedResults.ValidationProblem(...) over Identity's own
// IdentityResult errors).
import {
  apiFetch,
  ApiError,
  clearSession,
  parseJson,
  setAccessToken,
  UNEXPECTED_RESPONSE_MESSAGE,
} from "./client";

interface AuthResponseBody {
  accessToken: string;
  expiresAt: string;
}

interface ValidationProblemBody {
  errors?: Record<string, string[]>;
  title?: string;
}

// Flattens an ASP.NET ValidationProblem (or plain text) into one user-facing sentence.
async function extractValidationMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ValidationProblemBody | string;

    // Some failures (rate limiting, unexpected errors) are a bare JSON string.
    if (typeof body === "string") return body.length > 0 ? body : fallback;

    if (body.errors) {
      const messages = Object.values(body.errors).flat();
      if (messages.length > 0) return messages.join(" ");
    }
    return body.title ?? fallback;
  } catch {
    return fallback;
  }
}

// Maps the status of a failed login to a message. Only a real 401 means
// "wrong email or password" — a 404 or 5xx here is a server/config problem
// and must not tell someone their (correct) password is wrong.
function loginFailureMessage(status: number): string {
  if (status === 401) return "Incorrect email or password.";
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  return "We couldn't sign you in right now. Please try again in a moment.";
}

// Signs in and keeps the access token in memory; the server sets the refresh cookie.
export async function login(email: string, password: string): Promise<void> {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new ApiError(loginFailureMessage(response.status), response.status);
  }

  const data = await parseJson<AuthResponseBody | undefined>(response);
  if (typeof data?.accessToken !== "string") {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, response.status);
  }
  setAccessToken(data.accessToken);
}

// Creates an account, then signs in.
export async function register(email: string, password: string, displayName: string): Promise<void> {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });

  if (!response.ok) {
    const message = await extractValidationMessage(response, "Could not create your account.");
    throw new ApiError(message, response.status);
  }

  // Register only creates the account — it does not sign the new user in
  // or return a token, so log in right after with the same credentials.
  // From the caller's side this stays one "create account" action.
  await login(email, password);
}

// Revokes the session on the server (best effort) and clears local state.
export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // The server could not be reached, so the refresh token could not be
    // revoked there. Nothing more can be done from here — the person asked
    // to log out, so they are signed out locally regardless (below).
  } finally {
    // Clear client-side state unconditionally — never leave someone
    // looking signed in after they asked to log out, even if this call failed.
    clearSession();
  }
}
