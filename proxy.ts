// proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "valora_session";

export function proxy(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login"; // or "/auth/signin"
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/restaurant/:path*"],
};