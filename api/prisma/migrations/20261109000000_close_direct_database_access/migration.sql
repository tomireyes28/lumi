-- Lumi accesses these tables exclusively through Railway/Prisma, not Supabase Auth/REST.
-- Owners/BYPASSRLS retain access; do not FORCE RLS or add public access policies.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
  table_name text;
  api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User', 'Category', 'CreditCard', 'Transaction',
    'Reminder', 'Budget', 'CardCycle', '_prisma_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
    END LOOP;
  END LOOP;

  -- Global defaults and per-schema defaults are additive. Revoke both, for the
  -- migration creator (postgres on Supabase), so new Prisma tables stay private.
  ALTER DEFAULT PRIVILEGES REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES REVOKE ALL PRIVILEGES ON TABLES FROM %I', api_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I', api_role);
  END LOOP;
END $$;

COMMIT;
