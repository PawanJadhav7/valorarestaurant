//frontend/components/restaurant/TopNavWidgets.tsx
"use client";

import * as React from "react";

type WeatherResp = {
  ok: boolean;
  temp_c?: number;
  wind_kph?: number;
  code?: number;
  error?: string;
};

type ReverseGeoResp =
  | { ok: true; name: string }
  | { ok: false; error?: string };

function fmt0(n: number) {
  return Number.isFinite(n) ? n.toFixed(0) : "—";
}

export function TopNavWidgets() {
  const [mounted, setMounted] = React.useState(false);

  const [coords, setCoords] = React.useState<{ lat: number; lon: number } | null>(null);
  const [geoErr, setGeoErr] = React.useState<string | null>(null);

  const [place, setPlace] = React.useState<string | null>(null);
  const [weather, setWeather] = React.useState<WeatherResp | null>(null);

  const [now, setNow] = React.useState<Date>(() => new Date());

  React.useEffect(() => setMounted(true), []);

  // Live clock (client-only to avoid hydration mismatch)
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Location (watchPosition is more reliable than getCurrentPosition)
  React.useEffect(() => {
    if (!navigator.geolocation) {
      setGeoErr("Geolocation not supported");
      return;
    }

    let cleared = false;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cleared) return;
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoErr(null);
      },
      (err) => {
        if (cleared) return;
        // Most common: permission denied / insecure origin / timeout
        setGeoErr(err.message || "Location unavailable");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 }
    );

    return () => {
      cleared = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Reverse geocode (convert coords -> place name)
  React.useEffect(() => {
    let alive = true;

    async function loadPlace() {
      if (!coords) return;
      try {
        const r = await fetch(`/api/public/reverse-geocode?lat=${coords.lat}&lon=${coords.lon}`, { cache: "no-store" });
        const j = (await r.json()) as ReverseGeoResp;
        if (!alive) return;

        if ("ok" in j && j.ok) setPlace(j.name);
        else setPlace(null);
      } catch {
        if (alive) setPlace(null);
      }
    }

    loadPlace();
    return () => {
      alive = false;
    };
  }, [coords]);

  // Weather once we have coords (refresh every 10 minutes)
  React.useEffect(() => {
    let alive = true;
    let interval: number | null = null;

    async function load() {
      if (!coords) return;
      try {
        const r = await fetch(`/api/public/weather?lat=${coords.lat}&lon=${coords.lon}`, { cache: "no-store" });
        const j = (await r.json()) as WeatherResp;
        if (alive) setWeather(j);
      } catch (e: any) {
        if (alive) setWeather({ ok: false, error: e?.message ?? "Weather fetch failed" });
      }
    }

    load();
    if (coords) interval = window.setInterval(load, 10 * 60_000);

    return () => {
      alive = false;
      if (interval) window.clearInterval(interval);
    };
  }, [coords]);

  const timeStr = mounted
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now)
    : "—";

  const locationStr = place
    ? place
    : coords
      ? `Lat ${coords.lat.toFixed(3)}, Lon ${coords.lon.toFixed(3)}`
      : geoErr
        ? "Location off"
        : "Locating…";

  const weatherStr =
    weather?.ok && typeof weather.temp_c === "number"
      ? `${fmt0(weather.temp_c)}°C • ${fmt0(weather.wind_kph ?? NaN)} kph`
      : weather?.ok === false
        ? "Weather —"
        : "Weather…";

  return (
    <div className="flex items-center gap-2">
      <Pill label="" value={weatherStr} />
      <Pill label="" value={locationStr} />
      <Pill label="" value={timeStr} />
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass flex items-center gap-2 rounded-2xl border border-border/20 bg-background/20 px-3 py-1.5 text-xs shadow-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium whitespace-nowrap">{value}</span>
    </div>
  );
}