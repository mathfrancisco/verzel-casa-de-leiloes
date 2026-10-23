CREATE TYPE "public"."chain_entry_type" AS ENUM('BID', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."lot_category" AS ENUM('PAINTING', 'SCULPTURE', 'PHOTOGRAPHY', 'PRINT', 'DRAWING', 'TEXTILE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."lot_state" AS ENUM('ACTIVE', 'SETTLED', 'CLOSED_NO_WINNER', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"sha256" char(64) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lot_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lot_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" "chain_entry_type" NOT NULL,
	"bidder_id" uuid,
	"bidder_pseudonym" varchar(32),
	"amount_cents" bigint,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"prev_hash" char(64) NOT NULL,
	"hash" char(64) NOT NULL,
	"signature" text NOT NULL,
	CONSTRAINT "lot_entries_seq_positive" CHECK ("lot_entries"."seq" >= 1),
	CONSTRAINT "lot_entries_bid_fields" CHECK ("lot_entries"."type" <> 'BID' OR ("lot_entries"."bidder_id" IS NOT NULL AND "lot_entries"."bidder_pseudonym" IS NOT NULL AND "lot_entries"."amount_cents" > 0))
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seller_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"item_source" text NOT NULL,
	"item_external_id" text NOT NULL,
	"item_snapshot" jsonb NOT NULL,
	"title" varchar(140) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" "lot_category" NOT NULL,
	"starting_price_cents" bigint NOT NULL,
	"min_increment_cents" bigint NOT NULL,
	"starts_at" timestamp (3) with time zone NOT NULL,
	"ends_at" timestamp (3) with time zone NOT NULL,
	"original_ends_at" timestamp (3) with time zone NOT NULL,
	"state" "lot_state" DEFAULT 'ACTIVE' NOT NULL,
	"current_price_cents" bigint,
	"leader_id" uuid,
	"bid_count" integer DEFAULT 0 NOT NULL,
	"chain_length" integer DEFAULT 0 NOT NULL,
	"genesis_hash" char(64) NOT NULL,
	"head_hash" char(64) NOT NULL,
	"seller_pseudonym" varchar(32) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp (3) with time zone,
	"cancelled_at" timestamp (3) with time zone,
	CONSTRAINT "lots_prices_positive" CHECK ("lots"."starting_price_cents" > 0 AND "lots"."min_increment_cents" > 0),
	CONSTRAINT "lots_ends_after_start" CHECK ("lots"."ends_at" > "lots"."starts_at"),
	CONSTRAINT "lots_end_only_extends" CHECK ("lots"."original_ends_at" <= "lots"."ends_at"),
	CONSTRAINT "lots_leader_matches_bids" CHECK (("lots"."bid_count" = 0) = ("lots"."leader_id" IS NULL)),
	CONSTRAINT "lots_price_matches_bids" CHECK (("lots"."bid_count" = 0) = ("lots"."current_price_cents" IS NULL)),
	CONSTRAINT "lots_chain_counts" CHECK ("lots"."chain_length" >= "lots"."bid_count" AND "lots"."bid_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lot_id" uuid NOT NULL,
	"public_code" text NOT NULL,
	"winner_id" uuid NOT NULL,
	"winner_pseudonym" varchar(32) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"final_hash" char(64) NOT NULL,
	"signature" text NOT NULL,
	"issued_at" timestamp (3) with time zone NOT NULL,
	"revoked_at" timestamp (3) with time zone
);
--> statement-breakpoint
ALTER TABLE "lot_entries" ADD CONSTRAINT "lot_entries_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_entries" ADD CONSTRAINT "lot_entries_bidder_id_users_id_fk" FOREIGN KEY ("bidder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_leader_id_users_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lot_entries_lot_seq_unique" ON "lot_entries" USING btree ("lot_id","seq");--> statement-breakpoint
CREATE INDEX "lot_entries_bidder_lot_idx" ON "lot_entries" USING btree ("bidder_id","lot_id");--> statement-breakpoint
CREATE INDEX "lots_state_ends_idx" ON "lots" USING btree ("state","ends_at");--> statement-breakpoint
CREATE INDEX "lots_state_starts_idx" ON "lots" USING btree ("state","starts_at");--> statement-breakpoint
CREATE INDEX "lots_active_leader_idx" ON "lots" USING btree ("leader_id") WHERE "lots"."state" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "lots_seller_created_idx" ON "lots" USING btree ("seller_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_lot_unique" ON "receipts" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_public_code_unique" ON "receipts" USING btree ("public_code");--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;