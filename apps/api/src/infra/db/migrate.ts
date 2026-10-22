import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Sobe a partir deste arquivo até achar `drizzle/meta/_journal.json`. Funciona tanto rodando o
 * fonte (`src/infra/db`) quanto o bundle (`dist/`), sem configurar caminho.
 */
function findMigrationsFolder(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth++) {
    const candidate = join(dir, 'drizzle');
    if (existsSync(join(candidate, 'meta', '_journal.json'))) return candidate;
    dir = dirname(dir);
  }
  throw new Error('Pasta de migrations (drizzle/) não encontrada.');
}

export async function runMigrations(url: string): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: findMigrationsFolder() });
  } finally {
    await sql.end();
  }
}

// Execução direta: `pnpm db:migrate`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL não definida.');
    process.exit(1);
  }
  await runMigrations(url);
  console.log('Migrations aplicadas.');
}
