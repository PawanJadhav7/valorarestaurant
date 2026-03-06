// app/api/auth/debug/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await cookies();
  const all = c.getAll().map((x) => ({ name: x.name, hasValue: !!x.value, len: x.value?.length ?? 0 }));
  const v = c.get("valora_session")?.value ?? null;

  return NextResponse.json({
    ok: true,
    cookie_names: all,
    valora_session: v ? { starts: v.slice(0, 8), len: v.length } : null,
  });
}