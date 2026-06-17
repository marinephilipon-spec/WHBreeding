-- The Netlify Functions runtime connects to the database through NETLIFY_DB_URL,
-- which resolves to the `netlifydb_readonly` role. The application tables are
-- owned by `netlifydb_owner`, and that role was only granted SELECT — so the
-- runtime could read rows but every INSERT/UPDATE/DELETE failed with
-- "permission denied for table ...". The failures were swallowed by the
-- fire-and-forget client writes, so a newly created horse showed up in the UI
-- but was never saved and disappeared on the next page load.
--
-- Grant the runtime role the write privileges it needs on the existing tables
-- and sequences, and set default privileges so future tables are writable too.
-- This is a roll-forward fix; it does not modify any earlier migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'netlifydb_readonly') THEN
    GRANT USAGE ON SCHEMA public TO netlifydb_readonly;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO netlifydb_readonly;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO netlifydb_readonly;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO netlifydb_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO netlifydb_readonly;
  END IF;
END
$$;
