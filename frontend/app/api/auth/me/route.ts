// import { NextResponse } from "next/server";
// import { Pool } from "pg";
// import { getSessionUser } from "@/lib/auth";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// const API_BASE =
//   process.env.NEXT_PUBLIC_VALORA_API_BASE_URL ||
//   "https://valorarestaurant.onrender.com";

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// async function getCurrentTenantIdForUser(userId: string): Promise<string | null> {
//   const tenantRes = await pool.query(
//     `
//     select tenant_id
//     from app.v_user_current_tenant
//     where user_id = $1
//     limit 1
//     `,
//     [userId]
//   );

//   if (tenantRes.rowCount === 0) return null;
//   return tenantRes.rows[0]?.tenant_id ?? null;
// }

// export async function GET() {
//   console.log("AUTH ME route hit");
//   try {
    
//     const user = await getSessionUser();

//     if (!user?.user_id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const tenantId = await getCurrentTenantIdForUser(user.user_id);

//     if (!tenantId) {
//       return NextResponse.json({ error: "Tenant not resolved" }, { status: 403 });
//     }

//     const url = `${API_BASE}/api/dashboard/latest-date?tenant_id=${encodeURIComponent(
//       tenantId
//     )}`;

//     const res = await fetch(url, {
//       method: "GET",
//       cache: "no-store",
//     });

//     const text = await res.text();

//     return new NextResponse(text, {
//       status: res.status,
//       headers: {
//         "content-type": "application/json",
//         "cache-control": "no-store",
//       },
//     });
//   } catch (error: any) {
//     return NextResponse.json(
//       { error: error?.message ?? "Failed to fetch latest dashboard date" },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  console.log("AUTH ME route hit");

  try {
    const user = await getSessionUser();
    console.log("AUTH ME resolved user =", user);

    if (!user) {
      console.log("AUTH ME returning 401");
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

    console.log("AUTH ME returning 200");

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
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.log("AUTH ME returning 500", e?.message);
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