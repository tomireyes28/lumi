-- AlterTable (Idempotent)
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "installmentGroupId" TEXT;

-- CreateTable (Idempotent)
CREATE TABLE IF NOT EXISTS "CardCycle" (
    "id" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "closingDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable (Idempotent)
CREATE TABLE IF NOT EXISTS "Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (Idempotent)
CREATE INDEX IF NOT EXISTS "Category_userId_idx" ON "Category"("userId");

-- CreateIndex (Idempotent)
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex (Idempotent)
CREATE INDEX IF NOT EXISTS "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");

-- CreateIndex (Idempotent)
CREATE INDEX IF NOT EXISTS "Transaction_userId_creditCardId_idx" ON "Transaction"("userId", "creditCardId");

-- CreateIndex (Idempotent)
CREATE INDEX IF NOT EXISTS "Transaction_userId_installmentGroupId_idx" ON "Transaction"("userId", "installmentGroupId");

-- CreateIndex (Idempotent)
CREATE INDEX IF NOT EXISTS "CreditCard_userId_idx" ON "CreditCard"("userId");

-- CreateIndex (Idempotent)
CREATE INDEX IF NOT EXISTS "CardCycle_creditCardId_idx" ON "CardCycle"("creditCardId");

-- CreateIndex (Idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "CardCycle_creditCardId_year_month_key" ON "CardCycle"("creditCardId", "year", "month");

-- CreateIndex (Idempotent)
CREATE INDEX IF NOT EXISTS "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex (Idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Budget_userId_categoryId_key" ON "Budget"("userId", "categoryId");

-- AddForeignKey (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CardCycle_creditCardId_fkey'
    ) THEN
        ALTER TABLE "CardCycle" ADD CONSTRAINT "CardCycle_creditCardId_fkey"
        FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Budget_userId_fkey'
    ) THEN
        ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Budget_categoryId_fkey'
    ) THEN
        ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
