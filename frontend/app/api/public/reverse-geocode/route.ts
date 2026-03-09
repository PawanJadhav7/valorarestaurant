import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickPlaceName(j: any): string | null {
  const a = j?.address ?? {};
  const city =
    a.city ||
    a.town ||
    a.village ||
    a.hamlet ||
    a.suburb ||
    a.neighbourhood ||
    null;

  const state = a.state || a.region || null;
  const country = a.country || null;

  // Prefer "City, State" if present; fall back to display_name.
  if (city && state) return `${city}, ${state}`;
  if (city && country) return `${city}, ${country}`;
  if (city) return String(city);
  if (typeof j?.display_name === "string" && j.display_name.trim()) {
    // Keep it short (first 2 comma-separated parts)
    const parts = j.display_name.split(",").map((s: string) => s.trim());
    return parts.slice(0, 2).join(", ");
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json({ ok: false, error: "Missing lat/lon" }, { status: 400 });
    }

    // OpenStreetMap Nominatim (no key) — good for dev/MVP.
    const nominatimUrl =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=14&addressdetails=1`;

    const r = await fetch(nominatimUrl, {
      headers: {
        // Nominatim expects a UA (use your domain/app name)
        "User-Agent": "ValoraAI/0.1 (reverse-geocode)",
        "Accept-Language": "en",
      },
      cache: "no-store",
    });

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: `Reverse geocode HTTP ${r.status}` },
        { status: 200 }
      );
    }

    const j = await r.json();
    const name = pickPlaceName(j);

    return NextResponse.json(
      { ok: true, name: name ?? "Unknown location" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 200 }
    );
  }
}