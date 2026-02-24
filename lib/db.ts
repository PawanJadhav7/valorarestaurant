// 

//=======new file: lib/db.ts=======
// lib/db.ts
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export const pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon typically requires SSL in serverless environments.
    ssl: process.env.PGSSLMODE === "disable" ? undefined : { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== "production") global.__pgPool = pool;