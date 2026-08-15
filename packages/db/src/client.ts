import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

let _db: Db | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export function createDb(connectionString: string) {
  const sql = postgres(connectionString, { max: 10, prepare: false });
  _sql = sql;
  return drizzle(sql, { schema });
}

export function getDb(): Db | null {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _db = createDb(url);
  return _db;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function closeDb() {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
    _db = null;
  }
}
