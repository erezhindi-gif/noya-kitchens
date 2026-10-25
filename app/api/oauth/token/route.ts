import { NextRequest, NextResponse } from "next/server";
import { passwordStamp, sha256b64url, signPayload, verifyPayload } from "@/lib/quotes/auth";
import { getSecrets } from "@/lib/quotes/store";
import { ACCESS_DAYS, REFRESH_DAYS, SCOPE, cors } from "@/lib/quotes/oauth";

const err = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: cors });

async function readForm(req: NextRequest): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) return (await req.json().catch(() => ({}))) as Record<string, string>;
  return Object.fromEntries(new URLSearchParams(await req.text()));
}

async function issue(cid: string, ps: string) {
  const access = await signPayload({ t: "at", cid, ps, exp: Date.now() + ACCESS_DAYS * 864e5 });
  const refresh = await signPayload({ t: "rt", cid, ps, exp: Date.now() + REFRESH_DAYS * 864e5 });
  if (!access || !refresh) return err("server_error", 500);
  return NextResponse.json(
    { access_token: access, token_type: "Bearer", expires_in: ACCESS_DAYS * 86400, refresh_token: refresh, scope: SCOPE },
    { headers: { ...cors, "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const f = await readForm(req);
  const ps = await passwordStamp(await getSecrets());
  if (f.grant_type === "authorization_code") {
    const c = await verifyPayload<{ t: string; cid: string; ru: string; cc: string; ps: string }>(f.code);
    if (!c || c.t !== "code" || c.ps !== ps) return err("invalid_grant");
    if (f.redirect_uri && f.redirect_uri !== c.ru) return err("invalid_grant");
    if (!f.code_verifier || (await sha256b64url(f.code_verifier)) !== c.cc) return err("invalid_grant");
    return issue(c.cid, ps);
  }
  if (f.grant_type === "refresh_token") {
    const r = await verifyPayload<{ t: string; cid: string; ps: string }>(f.refresh_token);
    if (!r || r.t !== "rt" || r.ps !== ps) return err("invalid_grant");
    return issue(r.cid, ps);
  }
  return err("unsupported_grant_type");
}

export const OPTIONS = () => new NextResponse(null, { status: 204, headers: cors });
