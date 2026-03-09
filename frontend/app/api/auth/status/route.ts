import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // TODO: replace with real session + DB checks.
  // For MVP: read cookies or return defaults.
  // Example: if you set cookies after login/subscription/onboarding, read them here.

  const subscription_active = true; // <-- set false to test routing
  const onboarding_done = true;     // <-- set false to test routing

  return NextResponse.json(
    {
      ok: true,
      subscription_active,
      onboarding_done,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}