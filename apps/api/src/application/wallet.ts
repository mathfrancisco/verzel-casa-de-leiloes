import type { DepositInput, Wallet, WalletEntryType } from '@leilao/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DomainError } from '../domain/errors';
import { computeAvailable } from '../domain/wallet';
import type { Db } from '../infra/db/client';
import { idempotencyKeys, lots, walletEntries, wallets } from '../infra/db/schema';

export interface WalletDeps {
  db: Db;
}

export interface WalletViewer {
  id: string;
}

const DEPOSIT_ROUTE = '/api/wallet/deposits';
export type WalletTransaction = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Consulta saldo, compromissos ativos e os últimos lançamentos da carteira. */
export async function getWallet(deps: WalletDeps, viewer: WalletViewer): Promise<Wallet> {
  return deps.db.transaction(async (tx) => walletView(tx, viewer.id), {
    isolationLevel: 'repeatable read',
    accessMode: 'read only',
  });
}

/**
 * Registra um depósito com a carteira travada; a chave e o crédito ficam na mesma transação.
 * A trava também serializa depósitos concorrentes do mesmo licitante.
 */
export async function createDeposit(
  deps: WalletDeps,
  viewer: WalletViewer,
  input: DepositInput,
  idempotencyKey: string,
): Promise<Wallet> {
  return deps.db.transaction(async (tx) => {
    await tx.select().from(wallets).where(eq(wallets.userId, viewer.id)).for('update');

    const [stored] = await tx
      .select({ route: idempotencyKeys.route, response: idempotencyKeys.response })
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, viewer.id), eq(idempotencyKeys.key, idempotencyKey)));
    if (stored) {
      if (stored.route !== DEPOSIT_ROUTE) {
        throw new DomainError(
          'VALIDATION_ERROR',
          { field: 'Idempotency-Key' },
          'Chave de idempotência já usada em outra operação.',
        );
      }
      return stored.response as Wallet;
    }

    await tx.insert(walletEntries).values({
      userId: viewer.id,
      type: 'DEPOSIT',
      amountCents: input.amountCents,
    });
    await tx
      .update(wallets)
      .set({
        balanceCents: sql`${wallets.balanceCents} + ${input.amountCents}`,
        updatedAt: sql`now()`,
      })
      .where(eq(wallets.userId, viewer.id));

    const response = await walletView(tx, viewer.id);
    await tx.insert(idempotencyKeys).values({
      userId: viewer.id,
      key: idempotencyKey,
      route: DEPOSIT_ROUTE,
      response,
    });
    return response;
  });
}

export async function walletView(tx: WalletTransaction, userId: string): Promise<Wallet> {
  const [wallet] = await tx
    .select({ userId: wallets.userId })
    .from(wallets)
    .where(eq(wallets.userId, userId));
  if (!wallet) throw new Error('Carteira ausente para usuário existente.');

  // O saldo apresentado é o razão; `wallets.balance_cents` é uma projeção para atualização atômica.
  const [ledger] = await tx
    .select({
      totalCents: sql<number>`coalesce(sum(${walletEntries.amountCents}), 0)::bigint`.mapWith(
        Number,
      ),
    })
    .from(walletEntries)
    .where(eq(walletEntries.userId, userId));

  const commitments = await tx
    .select({
      lotId: lots.id,
      title: lots.title,
      amountCents: lots.currentPriceCents,
      endsAt: lots.endsAt,
    })
    .from(lots)
    .where(
      and(
        eq(lots.state, 'ACTIVE'),
        eq(lots.leaderId, userId),
        sql`${lots.currentPriceCents} IS NOT NULL`,
      ),
    )
    .orderBy(lots.endsAt);
  const committedCents = commitments.reduce((total, lot) => total + (lot.amountCents ?? 0), 0);

  const entries = await tx
    .select({
      id: walletEntries.id,
      type: walletEntries.type,
      amountCents: walletEntries.amountCents,
      lotId: walletEntries.lotId,
      lotTitle: lots.title,
      createdAt: walletEntries.createdAt,
    })
    .from(walletEntries)
    .leftJoin(lots, eq(walletEntries.lotId, lots.id))
    .where(eq(walletEntries.userId, userId))
    .orderBy(desc(walletEntries.createdAt), desc(walletEntries.id))
    .limit(50);

  return {
    totalCents: ledger!.totalCents,
    committedCents,
    availableCents: computeAvailable(ledger!.totalCents, committedCents),
    commitments: commitments.map((lot) => ({
      lotId: lot.lotId,
      title: lot.title,
      amountCents: lot.amountCents!,
      endsAt: lot.endsAt.toISOString(),
    })),
    entries: entries.map((entry) => ({
      id: entry.id,
      type: entry.type as WalletEntryType,
      amountCents: entry.amountCents,
      lotId: entry.lotId,
      lotTitle: entry.lotTitle,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
