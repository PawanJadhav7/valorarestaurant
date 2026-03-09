// lib/tenant-context.ts
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function withTenant<T>(
  fn: (ctx: { client: any; userId: string; tenantId: string }) => Promise<T>
): Promise<T> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const client = await pool.connect();
  try {
    await client.query("begin");

    const t = await client.query(
      `
      select tenant_id
      from app.tenant_user
      where user_id = $1::uuid
      order by created_at asc
      limit 1
      `,
      [user.user_id]
    );

    const tenantId = t.rows?.[0]?.tenant_id ?? null;
    if (!tenantId) throw new Error("User not linked to a tenant");

    await client.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);

    const result = await fn({ client, userId: user.user_id, tenantId });

    await client.query("commit");
    return result;
  } catch (e) {
    try {
      await client.query("rollback");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}