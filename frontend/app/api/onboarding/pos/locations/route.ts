// frontend/app/api/onboarding/pos/locations/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Python API returned non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const provider    = String(body?.provider    ?? "").trim().toLowerCase();
    const api_key     = String(body?.api_key     ?? "").trim();
    const merchant_id = String(body?.merchant_id ?? "").trim() || undefined;

    if (!provider) {
      return NextResponse.json({ ok: false, error: "provider is required" }, { status: 400 });
    }
    if (!api_key) {
      return NextResponse.json({ ok: false, error: "api_key is required" }, { status: 400 });
    }
    if (provider === "clover" && !merchant_id) {
      return NextResponse.json({ ok: false, error: "merchant_id is required for Clover" }, { status: 400 });
    }

    const pythonBase = process.env.PYTHON_API_URL;
    if (!pythonBase) {
      return NextResponse.json(
        { ok: false, error: "PYTHON_API_URL is not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(`${pythonBase}/api/onboarding/pos/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, api_key, merchant_id }),
    });

    const data = await safeJson(res);

    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data?.detail || data?.error || "Failed to fetch locations" },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: data.provider,
      locations: data.locations,
    });

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Location fetch failed" },
      { status: 500 }
    );
  }
}
