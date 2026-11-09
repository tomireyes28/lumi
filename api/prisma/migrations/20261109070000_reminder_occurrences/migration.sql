BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE "ReminderRule" (
 id TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
 title TEXT NOT NULL,amount DECIMAL(10,2),"anchorOn" DATE NOT NULL,active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX "ReminderRule_userId_active_idx" ON "ReminderRule"("userId",active);
ALTER TABLE "Reminder" ADD COLUMN "ruleId" TEXT REFERENCES "ReminderRule"(id) ON DELETE SET NULL,
 ADD COLUMN "occurrencePeriod" TEXT, ADD COLUMN "isCancelled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Reminder_ruleId_occurrencePeriod_key" ON "Reminder"("ruleId","occurrencePeriod");
INSERT INTO "ReminderRule" (id,"userId",title,amount,"anchorOn")
 SELECT 'rule-'||id,"userId",title,amount,COALESCE("dueOn","dueDate"::date) FROM "Reminder" WHERE "isRecurring";
UPDATE "Reminder" SET "ruleId"='rule-'||id,"occurrencePeriod"=to_char(COALESCE("dueOn","dueDate"::date),'YYYY-MM') WHERE "isRecurring";
ALTER TABLE "ReminderRule" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ReminderRule" FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON "ReminderRule" FROM %I',r);END LOOP;
END $$;
COMMIT;
