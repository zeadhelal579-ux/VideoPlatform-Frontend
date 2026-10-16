// File: jwt.ts
// Purpose: Decodes a JWT's payload segment client-side. Pure function, no
// API calls, no state — belongs in utils/ alongside formatters.ts.
// Logic/Approach: A JWT's payload is base64url-encoded JSON, not
// encrypted, so reading it client-side is safe for display purposes (see
// types/user.ts). This never verifies the signature — it doesn't need to:
// the token's validity for anything that matters is checked server-side on
// every request via the Authorization header, regardless of what this
// function returns.

interface DecodedAccessTokenClaims {
  sub?: string;
  email?: string;
}

// Decodes (without verifying) the claims used for display; returns null when malformed.
export function decodeAccessToken(token: string): { id: string; email: string } | null {
  const payloadSegment = token.split(".")[1];
  if (!payloadSegment) return null;

  try {
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );

    const claims = JSON.parse(json) as DecodedAccessTokenClaims;
    if (!claims.sub || !claims.email) return null;

    return { id: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}
