// frontend/app/api/stripe/verify-session/route.ts
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
    const session_id = String(body?.session_id ?? "").trim();

    if (!session_id) {
      return NextResponse.json(
        { ok: false, error: "session_id is required" },
        { status: 400 }
      );
    }

    const pythonBase = process.env.PYTHON_API_URL;
    if (!pythonBase) {
      return NextResponse.json(
        { ok: false, error: "PYTHON_API_URL is not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(`${pythonBase}/api/stripe/verify-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id, user_id: user.user_id }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.detail || data?.error || "Stripe session verification failed",
        },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      tenant_id: data?.tenant_id ?? null,
      subscription_status: data?.subscription_status ?? null,
      redirect: "/onboarding/pos",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Verify session proxy failed" },
      { status: 500 }
    );
  }
}