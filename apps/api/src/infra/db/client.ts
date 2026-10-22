import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDb(url: string) {
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}

export type Db = ReturnType<typeof createDb>['db'];
export type Sql = ReturnType<typeof createDb>['sql'];
