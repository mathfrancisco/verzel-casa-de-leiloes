import type { AuditReportResponse } from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NodeAuditCrypto } from '../../src/infra/auditCrypto';
import { registerUser } from '../../src/application/auth';
import {
  DEMO_PASSWORD,
  DEMO_USERS,
  refreshDemoLots,
  resetDemo,
  seedCatalog,
  seedDemo,
} from '../../src/seed/seed';
import { buildTestApp, TEST_AUDIT_SIGNER, TEST_PSEUDONYM_SECRET } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;

const deps = () => ({
  db: testDb.db,
  catalog: seedCatalog(),
  signer: TEST_AUDIT_SIGNER,
  crypto: new NodeAuditCrypto(),
  pseudonymSecret: TEST_PSEUDONYM_SECRET,
});

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog: seedCatalog() });
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});

async function lotRows() {
  return testDb.sql<
    { id: string; state: string; bid_count: number; live: boolean; scheduled: boolean }[]
  >`
    SELECT id, state, bid_count,
      state = 'ACTIVE' AND starts_at <= now() AND ends_at > now() AS live,
      state = 'ACTIVE' AND starts_at > now() AS scheduled
    FROM lots ORDER BY created_at
  `;
}

async function expectAllIntact() {
  for (const lot of await lotRows()) {
    const report = (
      await app.inject({ method: 'GET', url: `/api/lots/${lot.id}/audit` })
    ).json<AuditReportResponse>();
    expect(report.verdict, `lote ${lot.id}`).toMatchObject({ status: 'INTACT' });
  }
}

describe('seed de demonstração (SP-10, CT-10-03)', () => {
  it('cria usuários, carteiras e os cinco lotes da modelagem §7 com auditoria íntegra', async () => {
    expect(await seedDemo(deps())).toEqual({ created: true });

    for (const user of DEMO_USERS) {
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: user.email, password: DEMO_PASSWORD },
      });
      expect(login.statusCode, user.email).toBe(200);
    }
    const balances = await testDb.sql<{ email: string; total: string }[]>`
      SELECT u.email, sum(e.amount_cents) AS total
      FROM users u JOIN wallet_entries e ON e.user_id = u.id
      WHERE e.type = 'DEPOSIT'
      GROUP BY u.email ORDER BY u.email
    `;
    expect(balances.map((b) => [b.email, Number(b.total)])).toEqual([
      ['ana@demo.com', 5_000_000],
      ['bruno@demo.com', 5_000_000],
    ]);

    const lots = await lotRows();
    expect(lots).toHaveLength(5);
    expect(lots.filter((lot) => lot.live && lot.bid_count >= 2)).toHaveLength(1);
    expect(lots.filter((lot) => lot.live)).toHaveLength(2);
    expect(lots.filter((lot) => lot.scheduled)).toHaveLength(1);
    expect(lots.filter((lot) => lot.state === 'SETTLED')).toHaveLength(1);
    expect(
      lots.filter((lot) => lot.state === 'CLOSED_NO_WINNER' && lot.bid_count === 0),
    ).toHaveLength(1);
    const [receipt] = await testDb.sql<{ count: string }[]>`SELECT count(*) FROM receipts`;
    expect(Number(receipt!.count)).toBe(1);

    await expectAllIntact();
  });

  it('não duplica nada quando roda de novo', async () => {
    const before = await testDb.sql<{ users: string; lots: string; entries: string }[]>`
      SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM lots) AS lots,
        (SELECT count(*) FROM lot_entries) AS entries
    `;
    expect(await seedDemo(deps())).toEqual({ created: false });
    const after = await testDb.sql<{ users: string; lots: string; entries: string }[]>`
      SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM lots) AS lots,
        (SELECT count(*) FROM lot_entries) AS entries
    `;
    expect(after).toEqual(before);
    await expectAllIntact();
  });

  it('seed:reset apaga e recria com datas relativas a agora', async () => {
    const [old] = await lotRows();
    await resetDemo(testDb.url);
    expect(await seedDemo(deps())).toEqual({ created: true });
    const lots = await lotRows();
    expect(lots).toHaveLength(5);
    expect(lots.map((lot) => lot.id)).not.toContain(old!.id);
    await expectAllIntact();
  });

  it('avisa seed incompleto quando o leiloeiro existe sem os lotes', async () => {
    await resetDemo(testDb.url);
    await registerUser(deps(), { ...DEMO_USERS[0], password: DEMO_PASSWORD });
    expect(await seedDemo(deps())).toEqual({ created: false, partial: true });
  });

  it('repõe dois lotes ao vivo quando nenhum lote ativo termina no futuro', async () => {
    await resetDemo(testDb.url);
    expect(await refreshDemoLots(deps())).toEqual({ created: 0 });
    await seedDemo(deps());
    expect(await refreshDemoLots(deps())).toEqual({ created: 0 });

    await testDb.sql`UPDATE lots SET state = 'CANCELLED', cancelled_at = now()
      WHERE state = 'ACTIVE' AND ends_at > now()`;
    expect(await refreshDemoLots(deps())).toEqual({ created: 2 });
    const lots = await lotRows();
    expect(lots).toHaveLength(7);
    expect(lots.filter((lot) => lot.live)).toHaveLength(2);
    expect(await refreshDemoLots(deps())).toEqual({ created: 0 });
  });
});
