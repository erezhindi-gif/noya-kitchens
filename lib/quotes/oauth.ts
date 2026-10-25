// OAuth for the Claude connector. Erez signs in with the quote-system password; Claude gets a
// signed access token. Nothing is stored: codes and tokens are HMAC-signed and carry a stamp of
// the current password, so changing the password disconnects Claude.
export const ACCESS_DAYS = 30;
export const REFRESH_DAYS = 365;
export const SCOPE = "quotes";

/** Only Claude's own callback pages (and localhost for testing) may receive a code. */
export function redirectAllowed(uri: string) {
  try {
    const u = new URL(uri);
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
    if (u.protocol !== "https:") return false;
    return ["claude.ai", "claude.com", "anthropic.com"].some((d) => u.hostname === d || u.hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
};
