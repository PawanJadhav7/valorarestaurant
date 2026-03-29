import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${API_BASE}/api/alerts/update-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to update alert status",
      },
      { status: 500 }
    );
  }
}