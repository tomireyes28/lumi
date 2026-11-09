BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE "NotificationDelivery" (
 id TEXT PRIMARY KEY, "reminderId" TEXT NOT NULL REFERENCES "Reminder"(id) ON DELETE CASCADE,
 payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,
 "firstAttemptAt" TIMESTAMP(3),"nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "leaseUntil" TIMESTAMP(3),"leaseToken" TEXT,"acceptedAt" TIMESTAMP(3),"providerId" TEXT,"lastCode" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"(status,"nextAttemptAt");
ALTER TABLE "NotificationDelivery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "NotificationDelivery" FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON "NotificationDelivery" FROM %I',r);END LOOP;
END $$;
COMMIT;
