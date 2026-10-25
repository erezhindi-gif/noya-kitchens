import { NextRequest, NextResponse } from "next/server";
import { uid } from "@/lib/quotes/calc";
import { cors, redirectAllowed } from "@/lib/quotes/oauth";

// Dynamic client registration. Clients are not stored: the real gate is Erez's password at sign-in,
// and codes only go to Claude's own callback addresses.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const redirects: string[] = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirects.length && !redirects.every(redirectAllowed))
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400, headers: cors });
  return NextResponse.json(
    {
      client_id: `nq-${uid(16)}`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: body.client_name || "Claude",
      redirect_uris: redirects,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: cors }
  );
}

export const OPTIONS = () => new NextResponse(null, { status: 204, headers: cors });
