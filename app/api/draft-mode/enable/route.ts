import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  (await draftMode()).enable();
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") || "/";
  redirect(redirectTo);
}
