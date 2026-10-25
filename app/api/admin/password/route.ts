import { NextRequest, NextResponse } from "next/server";
import { checkPassword, hashPassword } from "@/lib/quotes/auth";
import { getSecrets, patchSecrets } from "@/lib/quotes/store";

// Change the password while logged in: needs the current one.
export async function POST(req: NextRequest) {
  const { current, next } = await req.json().catch(() => ({}));
  if (String(next || "").length < 8) return NextResponse.json({ error: "too-short" }, { status: 400 });
  const secrets = await getSecrets();
  if (!(await checkPassword(String(current || ""), secrets))) return NextResponse.json({ error: "wrong-password" }, { status: 401 });
  const { hash, salt } = await hashPassword(String(next));
  await patchSecrets({ passHash: hash, passSalt: salt });
  return NextResponse.json({ ok: true });
}
