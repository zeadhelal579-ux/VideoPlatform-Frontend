// File: user.ts
// Purpose: The signed-in user's identity, as far as the frontend can know
// it.
// Logic/Approach: AuthResponse (AuthEndpoints.cs) is deliberately just
// `{ accessToken, expiresAt }` — the backend never sends a user object back
// from /login or /refresh (FLOW.md's own text describes `{ accessToken,
// refreshToken }`, but the refresh token travels only in the httpOnly
// cookie by design; there is no `GET /api/me` either). The access token
// itself already carries `sub` (user id) and `email` as JWT claims
// (JwtTokenGenerator.cs), and a JWT's payload is base64url — not
// encrypted — so decoding it client-side to read those two claims for
// display is safe and standard; it is never used as an authorization
// decision, only the server-validated Bearer header is.
export interface AuthUser {
  id: string;
  email: string;
}
