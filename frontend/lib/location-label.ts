// frontend/lib/location-label.ts

export type LocationLike = {
  location_id?:   string | number | null;
  location_name?: string | null;
  name?:          string | null;
  location_code?: string | null;
  city?:          string | null;
  region?:        string | null;
  country_code?:  string | null;
};

export function prettifyLocationLabel(raw: string | null | undefined): string {
  if (!raw) return "Unknown Location";
  return raw
    .replace(/_[A-F0-9]{8,}$/i, "")
    .replace(/_LOCATION$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns display name for a location.
 *
 * Scenarios:
 *   1 location:        "Bella Napoli"
 *   city + region:     "Bella Napoli · Washington, DC"
 *   city only:         "Bella Napoli · Washington"
 *   region only:       "Bella Napoli · DC"
 */
export function getLocationDisplayName(location: LocationLike): string {
  const name = prettifyLocationLabel(
    location.location_name?.trim() ||
    location.name?.trim() ||
    location.location_code?.trim() ||
    (location.location_id != null ? String(location.location_id) : "")
  );

  // Build location suffix from city + region
  const city   = location.city?.trim()   ?? null;
  const region = location.region?.trim() ?? null;

  let suffix = "";
  if (city && region) {
    suffix = `${city}, ${region}`;
  } else if (city) {
    suffix = city;
  } else if (region) {
    suffix = region;
  }

  return suffix ? `${name} · ${suffix}` : name;
}
