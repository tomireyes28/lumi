ALTER TABLE "Transaction" ADD COLUMN "referenceDate" TIMESTAMP(3);
-- The legacy reference is unknown. Do not overwrite purchase/accounting dates.
