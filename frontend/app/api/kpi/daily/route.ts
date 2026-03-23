//frontend/app/api/kpi/daily/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const backendBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  const url = new URL(req.url);
  const qs = url.searchParams.toString();

  const resp = await fetch(`${backendBase}/api/kpi/daily?${qs}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  const text = await resp.text();

  return new NextResponse(text, {
    status: resp.status,
    headers: {
      "content-type": "application/json",
    },
  });
}