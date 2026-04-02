import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Python API returned non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const incoming = await req.formData();

    const provider = String(incoming.get("provider") ?? "").trim().toLowerCase();
    const mode = String(incoming.get("mode") ?? "").trim().toLowerCase();
    const file = incoming.get("file");
    if (provider === "csv" && !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "CSV file is required" },
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json({ ok: false, error: "provider is required" }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("user_id", user.user_id);
    formData.append("provider", provider);
    formData.append("mode", mode || "manual");

    if (file instanceof File) {
      formData.append("file", file);
    }

    const pythonBase = process.env.PYTHON_API_URL;
    if (!pythonBase) {
      return NextResponse.json(
        { ok: false, error: "PYTHON_API_URL is not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(`${pythonBase}/api/onboarding/pos`, {
      method: "POST",
      body: formData,
    });

    const data = await safeJson(res);

    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data?.detail || data?.error || "POS onboarding failed" },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "POS proxy failed" },
      { status: 500 }
    );
  }
}