BEGIN;
CREATE TABLE "OAuthGrant" (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "OAuthGrant_expiresAt_idx" ON "OAuthGrant"("expiresAt");
ALTER TABLE "OAuthGrant" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "OAuthGrant" FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('REVOKE ALL ON "OAuthGrant" FROM %I',r);
  END LOOP;
END $$;
COMMIT;
