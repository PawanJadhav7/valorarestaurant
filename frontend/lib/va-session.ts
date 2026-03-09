// lib/va-session.ts
export type VaGate = "auth" | "subscribed" | "onboarded";

export function getFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

export function setFlag(key: string, v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, v ? "1" : "0");
}

export function ensureGate(gate: VaGate): { ok: boolean; redirectTo?: string } {
  const authed = getFlag("va_authed");
  const subscribed = getFlag("va_subscribed");
  const onboarded = getFlag("va_onboarded");

  if (gate === "auth") return { ok: authed, redirectTo: authed ? undefined : "/auth/login" };
  if (!authed) return { ok: false, redirectTo: "/auth/login" };

  if (gate === "subscribed") return { ok: subscribed, redirectTo: subscribed ? undefined : "/billing" };
  if (!subscribed) return { ok: false, redirectTo: "/billing" };

  if (gate === "onboarded") return { ok: onboarded, redirectTo: onboarded ? undefined : "/onboarding" };
  return { ok: true };
}