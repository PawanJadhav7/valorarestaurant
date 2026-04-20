import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(v: unknown, max = 80) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

/*
GET
Returns existing profile info for onboarding prefill
*/
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const r = await pool.query(
      `
      select
        user_id,
        email,
        first_name,
        last_name,
        full_name,
        contact,
        onboarding_status
      from auth.app_user
      where user_id = $1::uuid
      `,
      [user.user_id]
    );

    if ((r.rowCount ?? 0) === 0) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      profile: r.rows[0],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/*
POST
Save profile information during onboarding
*/
export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  const first_name = cleanText(body?.first_name, 60);
  const last_name = cleanText(body?.last_name, 60);
  const contact = cleanText(body?.contact, 40);

  if (!first_name) {
    return NextResponse.json(
      { ok: false, error: "first_name is required" },
      { status: 400 }
    );
  }

  if (!last_name) {
    return NextResponse.json(
      { ok: false, error: "last_name is required" },
      { status: 400 }
    );
  }

  const full_name = `${first_name} ${last_name}`.trim();

  try {
    await pool.query(
      `
      update auth.app_user
      set
        first_name = $1,
        last_name = $2,
        full_name = $3,
        contact = nullif($4, ''),
        onboarding_status = case
          when onboarding_status is null
            or onboarding_status = ''
            or onboarding_status = 'started'
            then 'profile_done'
          when onboarding_status in ('profile_done', 'tenant_done', 'complete')
            then onboarding_status
          else onboarding_status
        end
      where user_id = $5::uuid
      `,
      [first_name, last_name, full_name, contact, user.user_id]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Onboarding update failed" },
      { status: 500 }
    );
  }
}