import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Verify demo credentials (server-side, against env vars) and, on success, set
// the httpOnly session cookie the middleware checks. No credentials or secret
// ever reach the client.
export async function POST(req: Request) {
  let user = "";
  let password = "";
  try {
    const body = await req.json();
    user = String(body.user ?? "");
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET;
  if (secret && user === process.env.DEMO_USER && password === process.env.DEMO_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("pm_auth", secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return res;
  }
  return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
}
