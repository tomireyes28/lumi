-- AlterTable Transaction: add paymentMethod preserving card classification even if card is later removed
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'cash';

UPDATE "Transaction" SET "paymentMethod" = 'credit_card' WHERE "creditCardId" IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_transaction_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."creditCardId" IS NOT NULL THEN
    NEW."paymentMethod" := 'credit_card';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_transaction_payment_method ON "Transaction";
CREATE TRIGGER trg_sync_transaction_payment_method
BEFORE INSERT OR UPDATE ON "Transaction"
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_payment_method();

-- Harden Transaction -> Category foreign key to RESTRICT deletion of categories with transactions under concurrency
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_categoryId_fkey";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Reminder: enforce DECIMAL(10,2) and add explicit isRecurring flag
ALTER TABLE "Reminder" ALTER COLUMN "amount" TYPE DECIMAL(10,2);
ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;
