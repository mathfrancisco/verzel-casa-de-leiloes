CREATE TYPE "public"."user_role" AS ENUM('AUCTIONEER', 'BIDDER');--> statement-breakpoint
CREATE TYPE "public"."wallet_entry_type" AS ENUM('DEPOSIT', 'SETTLEMENT_DEBIT', 'SETTLEMENT_CREDIT', 'REFUND_DEBIT', 'REFUND_CREDIT');--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"route" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "wallet_entry_type" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"lot_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_entries_amount_non_zero" CHECK ("wallet_entries"."amount_cents" <> 0),
	CONSTRAINT "wallet_entries_lot_required" CHECK ("wallet_entries"."type" = 'DEPOSIT' OR "wallet_entries"."lot_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance_cents" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_balance_non_negative" CHECK ("wallets"."balance_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_entries_lot_type_unique" ON "wallet_entries" USING btree ("lot_id","type") WHERE "wallet_entries"."type" <> 'DEPOSIT';--> statement-breakpoint
CREATE INDEX "wallet_entries_user_created_idx" ON "wallet_entries" USING btree ("user_id","created_at" DESC NULLS LAST);