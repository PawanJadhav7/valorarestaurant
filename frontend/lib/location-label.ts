export type LocationLike = {
  location_id?: string | number | null;
  location_name?: string | null;
  name?: string | null;
  location_code?: string | null;
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

export function getLocationDisplayName(location: LocationLike): string {
  const raw =
    location.location_name?.trim() ||
    location.name?.trim() ||
    location.location_code?.trim() ||
    (location.location_id != null ? String(location.location_id) : "");

  return prettifyLocationLabel(raw);
}