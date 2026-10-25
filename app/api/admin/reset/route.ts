import { NextRequest, NextResponse } from "next/server";
import { hashPassword, passwordFingerprint, verifyResetToken } from "@/lib/quotes/auth";
import { getSecrets, patchSecrets } from "@/lib/quotes/store";

// Public: sets a new password with the token from the reset mail.
export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}));
  if (String(password || "").length < 8) return NextResponse.json({ error: "too-short" }, { status: 400 });
  const s = await getSecrets();
  if (!(await verifyResetToken(String(token || ""), passwordFingerprint(s))))
    return NextResponse.json({ error: "bad-token" }, { status: 400 });
  const { hash, salt } = await hashPassword(String(password));
  await patchSecrets({ passHash: hash, passSalt: salt });
  return NextResponse.json({ ok: true });
}
