import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
}

function buildFullName(first: string | null, last: string | null) {
  const fn = (first ?? "").trim();
  const ln = (last ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  return full.length ? full : null;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

    const body = await req.json();

    const first_name = cleanText(body.first_name);
    const last_name = cleanText(body.last_name);
    const contact = cleanText(body.contact);

    // allow either explicit full_name or computed from first/last
    const full_name =
      buildFullName(first_name, last_name) ??
      cleanText(body.full_name) ??
      user.full_name ??
      null;

    await pool.query(
      `
      update auth.app_user
      set
        first_name = coalesce($2::text, first_name),
        last_name  = coalesce($3::text, last_name),
        contact    = coalesce($4::text, contact),
        full_name  = coalesce($5::text, full_name),
        onboarding_status = 'complete'
      where user_id = $1::uuid
      `,
      [user.user_id, first_name, last_name, contact, full_name]
    );

    // optional mirror table (only if it exists in your DB)
    try {
      await pool.query(
        `
        update public.app_user
        set full_name = coalesce($2::text, full_name)
        where user_id = $1::uuid
        `,
        [user.user_id, full_name]
      );
    } catch {}

    return NextResponse.json({ ok: true, redirect: "/restaurant" }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}