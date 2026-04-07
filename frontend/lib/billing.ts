// frontend/lib/billing.ts
import { pool } from "@/lib/db";

export type TenantSubscription = {
  tenant_id:           string;
  plan_code:           string;
  subscription_status: string;
  billing_provider:    string | null;
  billing_email:       string | null;
  trial_ends_at:       string | null;
  current_period_end:  string | null;
};

export async function getUserTenantSubscription(
  userId: string
): Promise<TenantSubscription | null> {
  const r = await pool.query(
    `
    SELECT
      tu.tenant_id,
      ts.plan_code,
      ts.subscription_status,
      ts.billing_provider,
      ts.billing_email,
      ts.trial_ends_at,
      ts.current_period_end
    FROM app.tenant_user tu
    LEFT JOIN app.tenant_subscription ts
      ON ts.tenant_id = tu.tenant_id
    WHERE tu.user_id = $1::uuid
    ORDER BY tu.created_at ASC
    LIMIT 1
    `,
    [userId]
  );

  const row = r.rows?.[0] ?? null;
  if (!row) return null;

  return {
    tenant_id:           String(row.tenant_id),
    plan_code:           row.plan_code           ?? "",
    subscription_status: row.subscription_status ?? "",
    billing_provider:    row.billing_provider    ?? null,
    billing_email:       row.billing_email       ?? null,
    trial_ends_at:       row.trial_ends_at       ? String(row.trial_ends_at) : null,
    current_period_end:  row.current_period_end  ? String(row.current_period_end) : null,
  };
}

// ── Status checks ────────────────────────────────────────────────────────────

/**
 * Full access statuses
 * active   → paid and current
 * trial    → our internal trial status
 * trialing → Stripe's trial status
 */
export function isSubscriptionActive(status: string | null | undefined): boolean {
  return ["active", "trial", "trialing"].includes((status ?? "").toLowerCase());
}

/**
 * Grace period — read-only access, 7 days to pay
 * past_due → payment failed but not yet canceled
 */
export function isSubscriptionGrace(status: string | null | undefined): boolean {
  return (status ?? "").toLowerCase() === "past_due";
}

/**
 * Fully blocked statuses
 * canceled           → subscription ended
 * incomplete_expired → payment never completed
 * unpaid             → invoice unpaid past grace
 */
export function isSubscriptionBlocked(status: string | null | undefined): boolean {
  return ["canceled", "incomplete_expired", "unpaid"].includes(
    (status ?? "").toLowerCase()
  );
}

/**
 * Check if trial has expired based on trial_ends_at date
 * even if status is still "trial" or "trialing"
 */
export function isTrialExpired(
  status:      string | null | undefined,
  trialEndsAt: string | null | undefined
): boolean {
  const s = (status ?? "").toLowerCase();
  if (s !== "trial" && s !== "trialing") return false;
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) < new Date();
}

/**
 * Days remaining in trial (null if not in trial or no end date)
 */
export function trialDaysRemaining(
  status:      string | null | undefined,
  trialEndsAt: string | null | undefined
): number | null {
  const s = (status ?? "").toLowerCase();
  if (s !== "trial" && s !== "trialing") return null;
  if (!trialEndsAt) return null;

  const end = new Date(trialEndsAt);
  if (!Number.isFinite(end.getTime())) return null;

  const ms = end.getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/**
 * Master access check combining status + trial expiry
 * Use this in layout.tsx instead of isSubscriptionActive()
 */
export function hasFullAccess(sub: TenantSubscription | null): boolean {
  if (!sub) return false;

  // Blocked statuses — no access
  if (isSubscriptionBlocked(sub.subscription_status)) return false;

  // Trial expired — no access
  if (isTrialExpired(sub.subscription_status, sub.trial_ends_at)) return false;

  // Active or valid trial
  return (
    isSubscriptionActive(sub.subscription_status) ||
    isSubscriptionGrace(sub.subscription_status)
  );
}
