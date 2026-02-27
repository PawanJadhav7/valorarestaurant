// lib/sim/seed.ts
import type { Branch, ClientAccount, PlanTier, SimDB, UserAccount } from "./types";

const STATES = ["MA", "NY", "CA", "TX", "FL", "IL", "WA", "GA", "NC", "AZ"];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function makeBranch(rng: () => number, clientId: string, idx: number, state: string): Branch {
  const city = pick(rng, [
    "Springfield",
    "Cambridge",
    "Austin",
    "Miami",
    "Seattle",
    "Phoenix",
    "Raleigh",
    "Atlanta",
    "Chicago",
    "San Jose",
  ]);

  return {
    id: `${clientId}-br-${pad2(idx)}`,
    name: `Branch ${pad2(idx)}`,
    city,
    state,
  };
}

function creditsForPlan(plan: PlanTier) {
  if (plan === "FREE") return 250;      // demo credits
  if (plan === "PREMIUM") return 2500;  // demo credits
  return 10000;                         // CUSTOM
}

export function buildSimSeed(seed = 42): SimDB {
  const rng = mulberry32(seed);

  // Force exactly: 2 CUSTOM, some PREMIUM, some FREE
  // Example distribution: 4 FREE, 4 PREMIUM, 2 CUSTOM
  const planAssignments: PlanTier[] = ["CUSTOM", "CUSTOM", "PREMIUM", "PREMIUM", "PREMIUM", "PREMIUM", "FREE", "FREE", "FREE", "FREE"];

  const clients: ClientAccount[] = STATES.map((st, i) => {
    const clientId = `cli_${pad2(i + 1)}`;
    const name = `Client ${pad2(i + 1)} (${st})`;

    const plan = planAssignments[i];
    const creditsTotal = creditsForPlan(plan);
    const creditsUsed = randInt(rng, 0, Math.floor(creditsTotal * 0.25));

    const branchesCount = randInt(rng, 1, 10);
    const branches = Array.from({ length: branchesCount }, (_, bi) =>
      makeBranch(rng, clientId, bi + 1, st)
    );

    // make some onboarded, some not
    const onboardingStatus = pick(rng, ["done", "in_progress", "not_started"] as const);
    const dataSource = pick(rng, ["CSV", "EXCEL", "POS"] as const);

    // Subscription active for PREMIUM/CUSTOM; FREE active as well (free tier)
    const subscriptionStatus = "active" as const;

    return {
      id: clientId,
      name,
      state: st,
      branches,
      plan,
      subscriptionStatus,
      creditsTotal,
      creditsUsed,
      onboardingStatus,
      dataSource,
    };
  });

  // One user per client (simple). Password demo: Valora@123
  // One user per client (simple). Password demo: Valora@123
  const users: UserAccount[] = clients.map((c, i) => ({
  id: `usr_${pad2(i + 1)}`, // ids can stay padded internally (fine)
  email: `owner${i + 1}@client${i + 1}.com`, // ✅ UNPADDED email pattern
  password: "Valora@123",
  name: `Operator ${pad2(i + 1)}`,
  clientId: c.id,
  role: "owner",
  }));

  return { users, clients };
}