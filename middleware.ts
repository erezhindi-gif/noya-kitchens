import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/quotes/auth";

// Everything under /admin and /api/admin needs Erez's session, except login and password reset.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const open = ["/admin/login", "/api/admin/login", "/admin/reset", "/api/admin/reset", "/api/admin/reset-request"];
  if (open.includes(pathname)) return NextResponse.next();
  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
