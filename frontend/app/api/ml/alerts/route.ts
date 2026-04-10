import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const c = await cookies();
    const sessionId = c.get("valora_session")?.value ?? "";

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const params = url.searchParams.toString();
    const backendUrl = `${API_BASE}/api/ml/alerts${params ? `?${params}` : ""}`;

    const r = await fetch(backendUrl, {
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
      },
      cache: "no-store",
    });

    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch ML alerts" },
      { status: 500 }
    );
  }
}
