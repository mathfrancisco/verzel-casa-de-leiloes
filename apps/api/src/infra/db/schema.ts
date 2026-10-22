import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  check,
  customType,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Referência: docs/04-modelagem-de-dados.md. Dinheiro em centavos (bigint em modo number, seguro
// até 2^53); tempo em timestamptz(3).

const citext = customType<{ data: string }>({ dataType: () => 'citext' });

const createdAt = () =>
  timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow();

export const userRole = pgEnum('user_role', ['AUCTIONEER', 'BIDDER']);

export const walletEntryType = pgEnum('wallet_entry_type', [
  'DEPOSIT',
  'SETTLEMENT_DEBIT',
  'SETTLEMENT_CREDIT',
  'REFUND_DEBIT',
  'REFUND_CREDIT',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    email: citext('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

export const wallets = pgTable(
  'wallets',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id),
    balanceCents: bigint('balance_cents', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('wallets_balance_non_negative', sql`${t.balanceCents} >= 0`)],
);

export const walletEntries = pgTable(
  'wallet_entries',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: walletEntryType('type').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    // FK para lots entra com a tabela de lotes (LC-006).
    lotId: uuid('lot_id'),
    createdAt: createdAt(),
  },
  (t) => [
    check('wallet_entries_amount_non_zero', sql`${t.amountCents} <> 0`),
    check('wallet_entries_lot_required', sql`${t.type} = 'DEPOSIT' OR ${t.lotId} IS NOT NULL`),
    // Um lote só pode ser liquidado/estornado uma vez por tipo de lançamento.
    uniqueIndex('wallet_entries_lot_type_unique')
      .on(t.lotId, t.type)
      .where(sql`${t.type} <> 'DEPOSIT'`),
    index('wallet_entries_user_created_idx').on(t.userId, t.createdAt.desc()),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    key: text('key').notNull(),
    route: text('route').notNull(),
    response: jsonb('response').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ name: 'idempotency_keys_pkey', columns: [t.userId, t.key] })],
);
