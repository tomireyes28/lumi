BEGIN;
CREATE TABLE "RateLimitBucket" (
 id TEXT PRIMARY KEY,
 hits INTEGER NOT NULL,
 "resetsAt" TIMESTAMP(3) NOT NULL,
 "blockedUntil" TIMESTAMP(3)
);
CREATE INDEX "RateLimitBucket_resetsAt_idx" ON "RateLimitBucket"("resetsAt");
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "RateLimitBucket" FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
   EXECUTE format('REVOKE ALL ON "RateLimitBucket" FROM %I',r);
 END LOOP;
END $$;
COMMIT;
