import { NextRequest, NextResponse } from "next/server";
import { checkPassword, passwordStamp, signPayload } from "@/lib/quotes/auth";
import { getSecrets } from "@/lib/quotes/store";
import { redirectAllowed } from "@/lib/quotes/oauth";

// The sign-in page posts here: right password → a 5-minute code sent back to Claude.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const redirect = String(b.redirect_uri || "");
  if (!redirectAllowed(redirect)) return NextResponse.json({ error: "bad-redirect" }, { status: 400 });
  if (b.response_type && b.response_type !== "code") return NextResponse.json({ error: "bad-request" }, { status: 400 });
  if (!b.code_challenge || (b.code_challenge_method && b.code_challenge_method !== "S256"))
    return NextResponse.json({ error: "pkce-required" }, { status: 400 });
  const secrets = await getSecrets();
  if (!(await checkPassword(String(b.password || ""), secrets))) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "wrong-password" }, { status: 401 });
  }
  const code = await signPayload({
    t: "code",
    cid: String(b.client_id || ""),
    ru: redirect,
    cc: String(b.code_challenge),
    ps: await passwordStamp(secrets),
    exp: Date.now() + 5 * 60_000,
  });
  if (!code) return NextResponse.json({ error: "server-not-configured" }, { status: 500 });
  const u = new URL(redirect);
  u.searchParams.set("code", code);
  if (b.state) u.searchParams.set("state", String(b.state));
  return NextResponse.json({ redirect: u.toString() });
}
