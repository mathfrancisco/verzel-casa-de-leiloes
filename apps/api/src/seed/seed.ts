import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuditCrypto, CatalogItem, CreateLotInput, Signer } from '@leilao/shared';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { registerUser } from '../application/auth';
import { placeBid } from '../application/bids';
import { createLot } from '../application/lots';
import { settleDueLots } from '../application/settlement';
import { createDeposit } from '../application/wallet';
import { FakeCatalog } from '../infra/catalog/fake-catalog';
import type { Db } from '../infra/db/client';
import { runMigrations } from '../infra/db/migrate';
import { lots, users } from '../infra/db/schema';

// Dados de demonstração de docs/04-modelagem-de-dados.md §7 (SP-10).

export const DEMO_PASSWORD = 'demo1234';
export const DEMO_USERS = [
  { name: 'Leiloeiro Demo', email: 'leiloeiro@demo.com', role: 'AUCTIONEER' },
  { name: 'Ana', email: 'ana@demo.com', role: 'BIDDER' },
  { name: 'Bruno', email: 'bruno@demo.com', role: 'BIDDER' },
] as const;
const DEPOSIT_CENTS = 5_000_000;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface SeedDeps {
  db: Db;
  catalog: FakeCatalog;
  signer: Signer;
  crypto: AuditCrypto;
  pseudonymSecret: string;
}

type FixtureItem = CatalogItem & { image: string };

/** Sobe a partir deste arquivo até achar `seed/fixtures`, no fonte e no bundle. */
function fixturesFolder(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth++) {
    const candidate = join(dir, 'seed', 'fixtures');
    if (existsSync(join(candidate, 'items.json'))) return candidate;
    dir = dirname(dir);
  }
  throw new Error('Pasta de fixtures do seed (seed/fixtures) não encontrada.');
}

/** Catálogo local do seed: não chama a API externa. */
export function seedCatalog(): FakeCatalog {
  const folder = fixturesFolder();
  const fixtures = JSON.parse(readFileSync(join(folder, 'items.json'), 'utf8')) as FixtureItem[];
  const items = fixtures.map(({ image: _image, ...item }) => item);
  const images = Object.fromEntries(
    fixtures.map((f) => [
      f.externalId,
      { bytes: new Uint8Array(readFileSync(join(folder, f.image))), contentType: 'image/png' },
    ]),
  );
  return new FakeCatalog(items, 0, images);
}

/**
 * Cria os dados de demonstração uma única vez. Lotes, lances e liquidações passam pelos mesmos
 * casos de uso da API, com relógio controlado, para que a cadeia de cada lote seja íntegra.
 */
export async function seedDemo(deps: SeedDeps): Promise<{ created: boolean; partial?: boolean }> {
  const [existing] = await deps.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_USERS[0].email));
  if (existing) {
    // Uma execução interrompida deixa o leiloeiro sem os 5 lotes: avisar em vez de seguir calado.
    const [owned] = await deps.db
      .select({ count: sql<number>`count(*)::int` })
      .from(lots)
      .where(eq(lots.sellerId, existing.id));
    return owned!.count < 5 ? { created: false, partial: true } : { created: false };
  }

  const [row] = await deps.db.execute<{ now: string }>(
    sql`SELECT date_trunc('milliseconds', now()) AS now`,
  );
  const t0 = new Date(row!.now).getTime();
  let current = new Date(t0);
  const at = (offset: number) => {
    current = new Date(t0 + offset);
  };
  const clocked = { ...deps, clock: () => current };

  const [seller, ana, bruno] = await Promise.all(
    DEMO_USERS.map((user) => registerUser(deps, { ...user, password: DEMO_PASSWORD })),
  );
  for (const bidder of [ana!, bruno!]) {
    await createDeposit(deps, bidder, { amountCents: DEPOSIT_CENTS }, randomUUID());
  }
  const sellerViewer = { id: seller!.id, role: 'AUCTIONEER' as const };
  const items = await deps.catalog.search('', 1);
  const item = (index: number) => items.items[index]!;

  const lot = async (
    index: number,
    startsAt: number,
    endsAt: number,
    startingPriceCents: number,
  ) => {
    at(startsAt - MINUTE);
    const input: CreateLotInput = {
      externalId: item(index).externalId,
      title: item(index).title,
      description: `Obra do acervo de demonstração: ${item(index).title}.`,
      category: item(index).suggestedCategory,
      startingPriceCents,
      minIncrementCents: startingPriceCents / 10,
      startsAt: new Date(t0 + startsAt),
      endsAt: new Date(t0 + endsAt),
    };
    return (await createLot(clocked, sellerViewer, input)).id;
  };
  const bid = async (
    lotId: string,
    bidder: { id: string },
    amountCents: number,
    offset: number,
  ) => {
    at(offset);
    await placeBid(
      clocked,
      { id: bidder.id, role: 'BIDDER' },
      lotId,
      { amountCents },
      randomUUID(),
    );
  };
  const settleAt = async (offset: number) => {
    at(offset);
    await settleDueLots(clocked, { limit: 1 });
  };

  // Liquidado com comprovante: Bruno vence.
  const settled = await lot(0, -3 * DAY, -2 * DAY, 50_000);
  await bid(settled, ana!, 50_000, -2 * DAY - 3 * HOUR);
  await bid(settled, bruno!, 60_000, -2 * DAY - HOUR);
  await settleAt(-2 * DAY + MINUTE);

  // Encerrado sem lances.
  await lot(1, -2 * DAY, -DAY, 30_000);
  await settleAt(-DAY + MINUTE);

  // Ao vivo com lances de Ana e Bruno, fim distante.
  const live = await lot(2, -2 * HOUR, 3 * DAY, 100_000);
  await bid(live, ana!, 100_000, -100 * MINUTE);
  await bid(live, bruno!, 110_000, -80 * MINUTE);
  await bid(live, ana!, 120_000, -60 * MINUTE);

  // Ao vivo terminando em minutos.
  const closing = await lot(3, -HOUR, 10 * MINUTE, 20_000);
  await bid(closing, bruno!, 20_000, -30 * MINUTE);

  // Agendado.
  await lot(4, DAY, 4 * DAY, 40_000);

  return { created: true };
}

/** Apaga todo o banco e reaplica as migrations (`seed:reset`). */
export async function resetDemo(url: string): Promise<void> {
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await admin.unsafe('DROP SCHEMA public CASCADE');
    await admin.unsafe('CREATE SCHEMA public');
  } finally {
    await admin.end();
  }
  await runMigrations(url);
}
