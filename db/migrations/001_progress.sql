-- Only Wort application data is created here. Neon manages neon_auth itself.
DO $wort_migration$
BEGIN
CREATE TABLE IF NOT EXISTS public.wort_progress (
  user_id text PRIMARY KEY CHECK (length(user_id) BETWEEN 1 AND 200),
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object' AND octet_length(document::text) <= 512000),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1 AND revision <= 9007199254740991),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only the server's database role may access this table. The browser receives
-- neither a database password nor a public SQL endpoint.
REVOKE ALL ON TABLE public.wort_progress FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    REVOKE ALL ON TABLE public.wort_progress FROM anonymous;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.wort_progress FROM authenticated;
  END IF;
END $wort_migration$;
