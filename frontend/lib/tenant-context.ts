import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function withTenant<T>(
  fn: (ctx: { client: any; userId: string; tenantId: string; tenantIds: string[] }) => Promise<T>
): Promise<T> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const t = await client.query(
      `SELECT tenant_id FROM app.tenant_user
       WHERE user_id = $1::uuid
       ORDER BY created_at ASC`,
      [user.user_id]
    );
    const tenantIds: string[] = t.rows.map((r: any) => r.tenant_id);
    const tenantId = tenantIds[0] ?? null;
    if (!tenantId) throw new Error("User not linked to a tenant");

    // MVP Option A: set all tenant IDs comma-separated for RLS
    // Post-MVP: replace with service role (Option B)
    // AWS: replace with JWT claims (Option C)
    await client.query(
      `SELECT set_config('app.tenant_id', $1, true)`,
      [tenantIds.join(',')]
    );

    const result = await fn({ client, userId: user.user_id, tenantId, tenantIds });
    await client.query("commit");
    return result;
  } catch (e) {
    try { await client.query("rollback"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
