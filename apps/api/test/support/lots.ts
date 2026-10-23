import { randomUUID } from 'node:crypto';
import type { createTestDatabase } from './database';

type TestDb = Awaited<ReturnType<typeof createTestDatabase>>;

export interface LotRowOptions {
  sellerId: string;
  title?: string;
  /** Minutos relativos a agora (negativo = passado). */
  startsInMin: number;
  endsInMin: number;
  state?: 'ACTIVE' | 'SETTLED' | 'CLOSED_NO_WINNER' | 'CANCELLED';
  startingPriceCents?: number;
}

/**
 * Insere um lote direto no banco, em qualquer fase (inclusive no passado), para testes de
 * leitura. A cadeia não é válida: use a API para testes que dependem dela.
 */
export async function insertLotRow(testDb: TestDb, opts: LotRowOptions): Promise<string> {
  const imageId = randomUUID();
  const lotId = randomUUID();
  const hash = '0'.repeat(64);
  await testDb.sql`
    INSERT INTO images (id, content_type, bytes, sha256) VALUES (${imageId}, 'image/png', '\\x00', ${hash})`;
  await testDb.sql`
    INSERT INTO lots (id, seller_id, image_id, item_source, item_external_id, item_snapshot, title,
                      category, starting_price_cents, min_increment_cents, starts_at, ends_at,
                      original_ends_at, state, genesis_hash, head_hash, seller_pseudonym)
    VALUES (${lotId}, ${opts.sellerId}, ${imageId}, 'artic', '1', '{}', ${opts.title ?? 'Obra'},
            'PAINTING', ${opts.startingPriceCents ?? 1000}, 100,
            now() + make_interval(mins => ${opts.startsInMin}),
            now() + make_interval(mins => ${opts.endsInMin}),
            now() + make_interval(mins => ${opts.endsInMin}),
            ${opts.state ?? 'ACTIVE'}, ${hash}, ${hash}, 'Leiloeiro X')`;
  return lotId;
}
