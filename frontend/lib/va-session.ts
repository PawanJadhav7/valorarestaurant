// frontend/lib/va-session.ts
export type VaGate = "auth" | "tenant" | "subscribed" | "onboarded";

export type VaSession = {
  tenant_id: string | null;
  subscription_active?: boolean;
  onboarding_done?: boolean;
};

const VA_SESSION_KEY = "va:session";
const TENANT_ID_KEY = "tenant_id";

const FLAG_AUTHED = "va_authed";
const FLAG_SUBSCRIBED = "va_subscribed";
const FLAG_ONBOARDED = "va_onboarded";

export function getFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

export function setFlag(key: string, v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, v ? "1" : "0");
}

export function clearFlag(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function getVaSession(): VaSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(VA_SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        tenant_id: parsed?.tenant_id ?? null,
        subscription_active:
          typeof parsed?.subscription_active === "boolean"
            ? parsed.subscription_active
            : undefined,
        onboarding_done:
          typeof parsed?.onboarding_done === "boolean"
            ? parsed.onboarding_done
            : undefined,
      };
    } catch {
      // ignore malformed session
    }
  }

  const tenantId = window.localStorage.getItem(TENANT_ID_KEY);
  if (tenantId) {
    return {
      tenant_id: tenantId,
    };
  }

  return null;
}

export function setVaSession(session: VaSession) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(VA_SESSION_KEY, JSON.stringify(session));

  if (session.tenant_id) {
    window.localStorage.setItem(TENANT_ID_KEY, session.tenant_id);
    document.cookie = `tenant_id=${session.tenant_id}; path=/; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(TENANT_ID_KEY);
    document.cookie =
      "tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }

  if (typeof session.subscription_active === "boolean") {
    setFlag(FLAG_SUBSCRIBED, session.subscription_active);
  }

  if (typeof session.onboarding_done === "boolean") {
    setFlag(FLAG_ONBOARDED, session.onboarding_done);
  }
}

export function clearVaSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(VA_SESSION_KEY);
  window.localStorage.removeItem(TENANT_ID_KEY);
  document.cookie =
    "tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

export function clearAllVaFlags() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(FLAG_AUTHED);
  window.localStorage.removeItem(FLAG_SUBSCRIBED);
  window.localStorage.removeItem(FLAG_ONBOARDED);
}

export function clearAllVaState() {
  clearAllVaFlags();
  clearVaSession();
}

export function markAuthed(v: boolean) {
  setFlag(FLAG_AUTHED, v);
}

export function markSubscribed(v: boolean) {
  setFlag(FLAG_SUBSCRIBED, v);
}

export function markOnboarded(v: boolean) {
  setFlag(FLAG_ONBOARDED, v);
}

export function ensureGate(gate: VaGate): { ok: boolean; redirectTo?: string } {
  const authed = getFlag(FLAG_AUTHED);
  const subscribed = getFlag(FLAG_SUBSCRIBED);
  const onboarded = getFlag(FLAG_ONBOARDED);
  const session = getVaSession();
  const hasTenant = Boolean(session?.tenant_id);

  if (gate === "auth") {
    return { ok: authed, redirectTo: authed ? undefined : "/signin" };
  }

  if (!authed) {
    return { ok: false, redirectTo: "/signin" };
  }

  if (gate === "tenant") {
    return { ok: hasTenant, redirectTo: hasTenant ? undefined : "/onboarding/tenant" };
  }

  if (!hasTenant) {
    return { ok: false, redirectTo: "/onboarding/tenant" };
  }

  if (gate === "subscribed") {
    return { ok: subscribed, redirectTo: subscribed ? undefined : "/billing" };
  }

  if (!subscribed) {
    return { ok: false, redirectTo: "/billing" };
  }

  if (gate === "onboarded") {
    return { ok: onboarded, redirectTo: onboarded ? undefined : "/onboarding" };
  }

  return { ok: true };
}