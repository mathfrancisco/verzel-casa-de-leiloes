import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  char,
  check,
  customType,
  integer,
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

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

const timestamptz = (name: string) => timestamp(name, { precision: 3, withTimezone: true });

const createdAt = () =>
  timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow();

export const userRole = pgEnum('user_role', ['AUCTIONEER', 'BIDDER']);

export const lotState = pgEnum('lot_state', ['ACTIVE', 'SETTLED', 'CLOSED_NO_WINNER', 'CANCELLED']);

export const lotCategory = pgEnum('lot_category', [
  'PAINTING',
  'SCULPTURE',
  'PHOTOGRAPHY',
  'PRINT',
  'DRAWING',
  'TEXTILE',
  'OTHER',
]);

export const chainEntryType = pgEnum('chain_entry_type', ['BID', 'CLOSED', 'CANCELLED']);

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
    lotId: uuid('lot_id').references(() => lots.id),
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

export const images = pgTable('images', {
  id: uuid('id').primaryKey(),
  contentType: text('content_type').notNull(),
  bytes: bytea('bytes').notNull(),
  sha256: char('sha256', { length: 64 }).notNull(),
  createdAt: createdAt(),
});

export const lots = pgTable(
  'lots',
  {
    id: uuid('id').primaryKey(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id),
    imageId: uuid('image_id')
      .notNull()
      .references(() => images.id),
    itemSource: text('item_source').notNull(),
    itemExternalId: text('item_external_id').notNull(),
    itemSnapshot: jsonb('item_snapshot').notNull(),
    title: varchar('title', { length: 140 }).notNull(),
    description: text('description').notNull().default(''),
    category: lotCategory('category').notNull(),
    startingPriceCents: bigint('starting_price_cents', { mode: 'number' }).notNull(),
    minIncrementCents: bigint('min_increment_cents', { mode: 'number' }).notNull(),
    startsAt: timestamptz('starts_at').notNull(),
    endsAt: timestamptz('ends_at').notNull(),
    originalEndsAt: timestamptz('original_ends_at').notNull(),
    state: lotState('state').notNull().default('ACTIVE'),
    currentPriceCents: bigint('current_price_cents', { mode: 'number' }),
    leaderId: uuid('leader_id').references(() => users.id),
    bidCount: integer('bid_count').notNull().default(0),
    chainLength: integer('chain_length').notNull().default(0),
    genesisHash: char('genesis_hash', { length: 64 }).notNull(),
    headHash: char('head_hash', { length: 64 }).notNull(),
    sellerPseudonym: varchar('seller_pseudonym', { length: 32 }).notNull(),
    createdAt: createdAt(),
    settledAt: timestamptz('settled_at'),
    cancelledAt: timestamptz('cancelled_at'),
  },
  (t) => [
    check('lots_prices_positive', sql`${t.startingPriceCents} > 0 AND ${t.minIncrementCents} > 0`),
    check('lots_ends_after_start', sql`${t.endsAt} > ${t.startsAt}`),
    check('lots_end_only_extends', sql`${t.originalEndsAt} <= ${t.endsAt}`),
    check('lots_leader_matches_bids', sql`(${t.bidCount} = 0) = (${t.leaderId} IS NULL)`),
    check('lots_price_matches_bids', sql`(${t.bidCount} = 0) = (${t.currentPriceCents} IS NULL)`),
    check('lots_chain_counts', sql`${t.chainLength} >= ${t.bidCount} AND ${t.bidCount} >= 0`),
    index('lots_state_ends_idx').on(t.state, t.endsAt),
    index('lots_state_starts_idx').on(t.state, t.startsAt),
    index('lots_active_leader_idx')
      .on(t.leaderId)
      .where(sql`${t.state} = 'ACTIVE'`),
    index('lots_seller_created_idx').on(t.sellerId, t.createdAt.desc()),
  ],
);

/** Cadeia append-only de lances e eventos do lote (trigger em 0003_lot_entries_append_only). */
export const lotEntries = pgTable(
  'lot_entries',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    lotId: uuid('lot_id')
      .notNull()
      .references(() => lots.id),
    seq: integer('seq').notNull(),
    type: chainEntryType('type').notNull(),
    bidderId: uuid('bidder_id').references(() => users.id),
    bidderPseudonym: varchar('bidder_pseudonym', { length: 32 }),
    amountCents: bigint('amount_cents', { mode: 'number' }),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamptz('created_at').notNull(),
    prevHash: char('prev_hash', { length: 64 }).notNull(),
    hash: char('hash', { length: 64 }).notNull(),
    signature: text('signature').notNull(),
  },
  (t) => [
    uniqueIndex('lot_entries_lot_seq_unique').on(t.lotId, t.seq),
    check('lot_entries_seq_positive', sql`${t.seq} >= 1`),
    check(
      'lot_entries_bid_fields',
      sql`${t.type} <> 'BID' OR (${t.bidderId} IS NOT NULL AND ${t.bidderPseudonym} IS NOT NULL AND ${t.amountCents} > 0)`,
    ),
    index('lot_entries_bidder_lot_idx').on(t.bidderId, t.lotId),
  ],
);

export const receipts = pgTable(
  'receipts',
  {
    id: uuid('id').primaryKey(),
    lotId: uuid('lot_id')
      .notNull()
      .references(() => lots.id),
    publicCode: text('public_code').notNull(),
    winnerId: uuid('winner_id')
      .notNull()
      .references(() => users.id),
    winnerPseudonym: varchar('winner_pseudonym', { length: 32 }).notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    finalHash: char('final_hash', { length: 64 }).notNull(),
    signature: text('signature').notNull(),
    issuedAt: timestamptz('issued_at').notNull(),
    revokedAt: timestamptz('revoked_at'),
  },
  (t) => [
    uniqueIndex('receipts_lot_unique').on(t.lotId),
    uniqueIndex('receipts_public_code_unique').on(t.publicCode),
  ],
);
