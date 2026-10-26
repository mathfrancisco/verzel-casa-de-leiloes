import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDb(url: string) {
  // `statement_timeout` impede que uma consulta travada segure uma das 10 conexões do pool; as
  // travas de lance duram milissegundos, então 15 s é folga ampla.
  const sql = postgres(url, {
    max: 10,
    onnotice: () => {},
    connection: { statement_timeout: 15_000 },
  });
  return { sql, db: drizzle(sql, { schema }) };
}

export type Db = ReturnType<typeof createDb>['db'];
export type Sql = ReturnType<typeof createDb>['sql'];
