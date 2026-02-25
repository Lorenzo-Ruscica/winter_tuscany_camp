-- =============================================
-- SCRIPT SQL: Crea funzione per Newsletter
-- DESCRIZIONE: Permette agli admin di ottenere tutte le email degli utenti registrati
-- USO: Eseguire questo script nella SQL Editor di Supabase
-- =============================================

-- 1. Crea la funzione (SECURITY DEFINER = Esegue con privilegi di sistema)
CREATE OR REPLACE FUNCTION get_all_user_emails()
RETURNS TABLE (email text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ritorna tutte le email dalla tabella auth.users
  RETURN QUERY
  SELECT au.email::text
  FROM auth.users au
  WHERE au.email IS NOT NULL;
END;
$$;

-- 2. Revoca permessi pubblici (per sicurezza)
REVOKE EXECUTE ON FUNCTION get_all_user_emails() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_all_user_emails() FROM anon;

-- 3. Concedi permesso solo agli utenti autenticati (Authenticated)
-- Nota: La protezione "vera" è lato client (il pannello admin controlla chi sei)
GRANT EXECUTE ON FUNCTION get_all_user_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_user_emails() TO service_role;

-- Conferma
SELECT 'Funzione get_all_user_emails creata con successo' as status;
