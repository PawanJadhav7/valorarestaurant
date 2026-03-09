// app/api/cron/ingest/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getProvidedSecret(req: Request) {
  const url = new URL(req.url);

  // Production: Authorization: Bearer <secret>
  const auth = (req.headers.get("authorization") ?? "").trim();
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  // Local/dev fallback: ?key=<secret>
  const queryKey = (url.searchParams.get("key") ?? "").trim();

  return bearer || queryKey;
}

export async function GET(req: Request) {
  const expected = (process.env.CRON_SECRET ?? "").trim();
  const provided = getProvidedSecret(req);

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Call the DB procedure (created below)
    const r = await pool.query(`call core.run_ingestion();`);

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Ingestion failed", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}