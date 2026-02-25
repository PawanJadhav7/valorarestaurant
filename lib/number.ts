export function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toNumOrZero(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}