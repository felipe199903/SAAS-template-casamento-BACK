-- Fix payments table: add missing columns purchase_id and payload
-- The payments table was created before these columns were added to the schema.
-- The existing 2 rows are test data with no real value and must be removed
-- before adding NOT NULL columns.

DELETE FROM "payments";

-- Add purchase_id column (required FK to purchases)
ALTER TABLE "payments" ADD COLUMN "purchase_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "payments" ALTER COLUMN "purchase_id" DROP DEFAULT;

-- Add payload column (required JSONB)
ALTER TABLE "payments" ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "payments" ALTER COLUMN "payload" DROP DEFAULT;

-- Add FK constraint (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_purchase_id_fkey'
  ) THEN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_purchase_id_fkey"
      FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
