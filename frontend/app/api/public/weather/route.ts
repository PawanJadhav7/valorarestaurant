import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ ok: false, error: "lat/lon required" }, { status: 400 });
    }

    // Open-Meteo (free, no key)
    const upstream = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&temperature_unit=celsius&wind_speed_unit=kmh`;

    const r = await fetch(upstream, { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `weather upstream ${r.status}` }, { status: 502 });
    }

    const j: any = await r.json();
    const cur = j?.current;

    return NextResponse.json(
      {
        ok: true,
        temp_c: cur?.temperature_2m ?? null,
        wind_kph: cur?.wind_speed_10m ?? null,
        code: cur?.weather_code ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}