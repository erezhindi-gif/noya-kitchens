import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, checkPassword, createSession } from "@/lib/quotes/auth";
import { getSecrets } from "@/lib/quotes/store";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const secrets = await getSecrets().catch(() => ({}));
  if (!(await checkPassword(String(password || ""), secrets))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: "wrong-password" }, { status: 401 });
  }
  const session = await createSession();
  if (!session) return NextResponse.json({ error: "server-not-configured" }, { status: 500 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
