import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await cookies();
  const v = c.get("valora_session")?.value ?? null;

  return NextResponse.json({
    ok: true,
    has_valora_session: !!v,
    valora_session: v ? { starts: v.slice(0, 8), len: v.length } : null,
  });
}