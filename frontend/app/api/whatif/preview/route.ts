import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
const API_BASE = process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const c = await cookies();
    const sessionId = c.get("valora_session")?.value ?? "";
    const body = await req.json();
    const r = await fetch(`${API_BASE}/api/whatif/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-id": sessionId },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
