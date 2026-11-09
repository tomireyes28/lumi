BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE "Transaction"
 ADD COLUMN "purchaseDate" TIMESTAMP(3),
 ADD COLUMN "statementYear" INTEGER,
 ADD COLUMN "statementMonth" INTEGER,
 ADD COLUMN "statementClosingDate" TIMESTAMP(3),
 ADD COLUMN "paymentDueDate" TIMESTAMP(3),
 ADD COLUMN "installmentNumber" INTEGER,
 ADD COLUMN "installmentCount" INTEGER;
-- Legacy transaction dates may already be installment/accounting dates.
-- Leave their origin and cycle unknown; never infer a purchase date from them.
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_statement_month_valid"
 CHECK ("statementMonth" IS NULL OR "statementMonth" BETWEEN 1 AND 12);
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_installment_position_valid"
 CHECK (("installmentNumber" IS NULL AND "installmentCount" IS NULL) OR
        ("installmentNumber" IS NOT NULL AND "installmentCount" IS NOT NULL AND
         "installmentNumber">=1 AND "installmentCount">="installmentNumber"));
CREATE INDEX "Transaction_userId_statementYear_statementMonth_idx"
 ON "Transaction"("userId","statementYear","statementMonth");
CREATE INDEX "Transaction_userId_paymentDueDate_idx" ON "Transaction"("userId","paymentDueDate");
ALTER TABLE "Reminder" ADD COLUMN "dueOn" DATE;
-- Reminder is a calendar field. Preserve the old UTC-midnight encoding;
-- other timestamps are interpreted in the explicit business timezone.
UPDATE "Reminder" SET "dueOn"=CASE WHEN "dueDate"::time='00:00:00' THEN "dueDate"::date
 ELSE ("dueDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date END;
CREATE INDEX "Reminder_dueOn_idx" ON "Reminder"("dueOn");
COMMIT;
