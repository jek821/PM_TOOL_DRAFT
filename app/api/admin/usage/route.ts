import { NextResponse } from "next/server";
import { getUsage, clearUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getUsage());
}

export async function DELETE() {
  clearUsage();
  return NextResponse.json({ ok: true });
}
