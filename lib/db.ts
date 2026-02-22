// lib/db.ts
import pg from "pg";
const { Pool } = pg;


const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

export const pool = new Pool({ connectionString: DATABASE_URL });
