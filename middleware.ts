import { NextRequest, NextResponse } from "next/server";

// Cookie-based demo gate. The /login page posts credentials to /api/login,
// which verifies them against DEMO_USER / DEMO_PASSWORD (server-side) and sets
// an httpOnly `pm_auth` cookie holding AUTH_SECRET. This middleware lets a
// request through only if that cookie matches AUTH_SECRET. All three vars live
// in the environment — nothing is hardcoded, and the secret never reaches the
// browser except as an httpOnly cookie the client can't read.
export function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const user = process.env.DEMO_USER;
  const pass = process.env.DEMO_PASSWORD;

  // Gate disabled when unconfigured (e.g. local dev without the vars). Set all
  // three in Vercel to enable it on the deploy.
  if (!secret || !user || !pass) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // The login page and its API must be reachable while signed out.
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  if (req.cookies.get("pm_auth")?.value === secret) return NextResponse.next();

  // Not signed in: APIs get a 401; pages redirect to the login screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Gate everything except Next internals and static asset files (by extension).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|webp|ico|pdf|txt|woff2?)).*)",
  ],
};
