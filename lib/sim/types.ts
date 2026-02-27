// lib/sim/types.ts
export type PlanTier = "FREE" | "PREMIUM" | "CUSTOM";

export type Branch = {
  id: string;
  name: string;
  city: string;
  state: string;
};

export type ClientAccount = {
  id: string;
  name: string;
  state: string;
  branches: Branch[];

  plan: PlanTier;
  subscriptionStatus: "active" | "inactive";
  creditsTotal: number;
  creditsUsed: number;

  // onboarding simulation
  onboardingStatus: "not_started" | "in_progress" | "done";
  dataSource: "CSV" | "EXCEL" | "POS";
};

export type UserAccount = {
  id: string;
  email: string;
  password: string; // demo only
  name: string;

  clientId: string;
  role: "owner" | "admin" | "ops";
};

export type SimDB = {
  users: UserAccount[];
  clients: ClientAccount[];
};

export type Session = {
  ok: boolean;
  userId: string;
  clientId: string;
  email: string;
  name: string;
  plan: PlanTier;
  subscriptionStatus: "active" | "inactive";
  onboardingStatus: "not_started" | "in_progress" | "done";
};