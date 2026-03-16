// frontend/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, user: null },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const display_name =
      user.full_name ||
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
      user.email;

    return NextResponse.json(
      {
        ok: true,
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          first_name: user.first_name,
          last_name: user.last_name,
          contact: user.contact,
          onboarding_status: user.onboarding_status,
          display_name,
          tenant_id: user.tenant_id ?? null,
          tenant_name: user.client_name ?? null,
          has_tenant: user.has_tenant ?? false,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        user: null,
        error: e?.message ?? "Internal server error",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}