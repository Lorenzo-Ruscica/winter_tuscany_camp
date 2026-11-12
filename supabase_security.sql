-- ============================================================
-- TUSCANY CAMP — SICUREZZA DATABASE (Supabase)
-- Eseguire TUTTO questo blocco nell'SQL Editor di Supabase
-- Dashboard → SQL Editor → New Query → Incolla → Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABELLA ADMINS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserisci gli admin attuali
INSERT INTO public.admins (email) VALUES
    ('admin@tuscanycamp.com'),
    ('mirko@gozzoli.com'),
    ('lorenzo.ruscica@outlook.it')
ON CONFLICT (email) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2. FUNZIONE HELPER: controlla se l'utente corrente è admin
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins
        WHERE email = (auth.jwt() ->> 'email')
    );
$$;

-- ────────────────────────────────────────────────────────────
-- 3. RLS — TABELLA: bookings
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_bookings" ON public.bookings;
CREATE POLICY "admin_all_bookings" ON public.bookings
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "user_read_own_bookings" ON public.bookings;
CREATE POLICY "user_read_own_bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_own_bookings" ON public.bookings;
CREATE POLICY "user_insert_own_bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_update_own_bookings" ON public.bookings;
CREATE POLICY "user_update_own_bookings" ON public.bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. RLS — TABELLA: registrations
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_registrations" ON public.registrations;
CREATE POLICY "admin_all_registrations" ON public.registrations
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "user_read_own_registration" ON public.registrations;
CREATE POLICY "user_read_own_registration" ON public.registrations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_own_registration" ON public.registrations;
CREATE POLICY "user_insert_own_registration" ON public.registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. RLS — TABELLA: teachers
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_teachers" ON public.teachers;
CREATE POLICY "admin_all_teachers" ON public.teachers
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "authenticated_read_teachers" ON public.teachers;
CREATE POLICY "authenticated_read_teachers" ON public.teachers
    FOR SELECT USING (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────
-- 6. RLS — TABELLA: teacher_availability
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_availability" ON public.teacher_availability;
CREATE POLICY "admin_all_availability" ON public.teacher_availability
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "authenticated_read_availability" ON public.teacher_availability;
CREATE POLICY "authenticated_read_availability" ON public.teacher_availability
    FOR SELECT USING (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────
-- 7. RLS — TABELLA: site_settings
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_settings" ON public.site_settings;
CREATE POLICY "admin_all_settings" ON public.site_settings
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "anon_read_settings" ON public.site_settings;
CREATE POLICY "anon_read_settings" ON public.site_settings
    FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────
-- 8. RLS — TABELLA: contact_messages
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_contacts" ON public.contact_messages;
CREATE POLICY "admin_all_contacts" ON public.contact_messages
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "anyone_insert_contacts" ON public.contact_messages;
CREATE POLICY "anyone_insert_contacts" ON public.contact_messages
    FOR INSERT WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 9. RLS — TABELLA: admins (protegge se stessa)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_admins" ON public.admins;
CREATE POLICY "admin_manage_admins" ON public.admins
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "user_check_own_admin" ON public.admins;
CREATE POLICY "user_check_own_admin" ON public.admins
    FOR SELECT USING (email = (auth.jwt() ->> 'email'));

-- ────────────────────────────────────────────────────────────
-- 10. PERMESSI FUNZIONE
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
