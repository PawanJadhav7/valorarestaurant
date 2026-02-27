// lib/sim/store.ts
"use client";

import type { ClientAccount, Session, SimDB, UserAccount, PlanTier } from "./types";
import { buildSimSeed } from "./seed";


const KEY_DB = "valora_sim_db_v1";
const KEY_SESSION = "valora_sim_session_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function isDemoMode(): boolean {
  if (!isBrowser()) return false;
  const sp = new URLSearchParams(window.location.search);
  return sp.get("demo") === "1";
}

export function loadDb(): SimDB {
  if (!isBrowser()) return buildSimSeed(42);

  const raw = window.localStorage.getItem(KEY_DB);
  if (raw) {
    try {
      return JSON.parse(raw) as SimDB;
    } catch {
      // fallthrough
    }
  }
  const seeded = buildSimSeed(42);
  window.localStorage.setItem(KEY_DB, JSON.stringify(seeded));
  return seeded;
}

export function saveDb(db: SimDB) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY_DB, JSON.stringify(db));
}

export function resetDb(seed = 42) {
  if (!isBrowser()) return;
  const seeded = buildSimSeed(seed);
  window.localStorage.setItem(KEY_DB, JSON.stringify(seeded));
  window.localStorage.removeItem(KEY_SESSION);
}

export function getSession(): Session | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(KEY_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY_SESSION, JSON.stringify(s));
}

export function clearSession() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY_SESSION);
  } catch {}
}

export function findUserByEmail(db: SimDB, email: string): UserAccount | null {
  const e = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === e) ?? null;
}

export function getClient(db: SimDB, clientId: string): ClientAccount | null {
  return db.clients.find((c) => c.id === clientId) ?? null;
}

export function login(email: string, password: string): { ok: true; session: Session } | { ok: false; error: string } {
  const db = loadDb();
  const user = findUserByEmail(db, email);
  if (!user) return { ok: false, error: "User not found" };
  if (user.password !== password) return { ok: false, error: "Invalid password" };

  const client = getClient(db, user.clientId);
  if (!client) return { ok: false, error: "Client not found" };

  const session: Session = {
    ok: true,
    userId: user.id,
    clientId: client.id,
    email: user.email,
    name: user.name,
    plan: client.plan,
    subscriptionStatus: client.subscriptionStatus,
    onboardingStatus: client.onboardingStatus,
  };

  setSession(session);
  return { ok: true, session };
}


export function signup(
  ownerNum: number,
  clientNum: number,
  name: string,
  password: string
): { ok: true; session: Session } | { ok: false; error: string } {
  const db = loadDb();

  if (!Number.isFinite(ownerNum) || ownerNum < 1 || ownerNum > 10) {
    return { ok: false, error: "Owner number must be 1–10" };
  }
  if (!Number.isFinite(clientNum) || clientNum < 1 || clientNum > 10) {
    return { ok: false, error: "Client number must be 1–10" };
  }

  const email = `owner${ownerNum}@client${clientNum}.com`.toLowerCase();
  const existing = findUserByEmail(db, email);
  if (existing) return { ok: false, error: "Account already exists" };

  const clientId = `cli_${String(clientNum).padStart(2, "0")}`;
  const client = getClient(db, clientId);
  if (!client) return { ok: false, error: "Client not found" };

  const user: UserAccount = {
    id: `usr_custom_${Date.now()}`,
    email,
    password: password || "Valora@123",
    name: name?.trim() || `Owner ${ownerNum}`,
    clientId: client.id,
    role: "owner",
  };

  db.users.push(user);
  saveDb(db);

  const session: Session = {
    ok: true,
    userId: user.id,
    clientId: client.id,
    email: user.email,
    name: user.name,
    plan: client.plan,
    subscriptionStatus: client.subscriptionStatus,
    onboardingStatus: client.onboardingStatus,
  };

  setSession(session);
  return { ok: true, session };
}

// Demo-only plan selection (used on signup/subscription flow)
export function setPlanForClient(clientId: string, plan: PlanTier) {
  const db = loadDb();
  const c = db.clients.find((x) => x.id === clientId);
  if (!c) return;

  c.plan = plan;
  c.subscriptionStatus = "active";
  c.creditsTotal = plan === "FREE" ? 250 : plan === "PREMIUM" ? 2500 : 10000;
  c.creditsUsed = Math.min(c.creditsUsed, c.creditsTotal);

  saveDb(db);

  const s = getSession();
  if (s && s.clientId === clientId) {
    setSession({
      ...s,
      plan: c.plan,
      subscriptionStatus: c.subscriptionStatus,
    });
  }
}



export function setOnboardingStatus(clientId: string, status: "not_started" | "in_progress" | "done") {
  const db = loadDb();
  const c = db.clients.find((x) => x.id === clientId);
  if (!c) return;

  c.onboardingStatus = status;
  saveDb(db);

  const s = getSession();
  if (s && s.clientId === clientId) {
    setSession({
      ...s,
      onboardingStatus: status,
    });
  }
}