// frontend/lib/billing.ts
import { pool } from "@/lib/db";

export type TenantSubscription = {
  tenant_id: string;
  plan_code: string;
  subscription_status: string;
  billing_provider: string | null;
  billing_email: string | null;
  trial_ends_at: string | null;
};

export async function getUserTenantSubscription(userId: string): Promise<TenantSubscription | null> {
  const r = await pool.query(
    `
    select
      tu.tenant_id,
      ts.plan_code,
      ts.subscription_status,
      ts.billing_provider,
      ts.billing_email,
      ts.trial_ends_at
    from app.tenant_user tu
    left join app.tenant_subscription ts
      on ts.tenant_id = tu.tenant_id
    where tu.user_id = $1::uuid
    order by tu.created_at asc
    limit 1
    `,
    [userId]
  );

  const row = r.rows?.[0] ?? null;
  if (!row) return null;

  return {
    tenant_id: String(row.tenant_id),
    plan_code: row.plan_code ?? "",
    subscription_status: row.subscription_status ?? "",
    billing_provider: row.billing_provider ?? null,
    billing_email: row.billing_email ?? null,
    trial_ends_at: row.trial_ends_at ? String(row.trial_ends_at) : null,
  };
}

export function isSubscriptionActive(status: string | null | undefined) {
  return status === "active" || status === "trial";
}