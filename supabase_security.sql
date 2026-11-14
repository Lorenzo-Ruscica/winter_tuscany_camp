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
    ('lorenzo.ruscica@outlook.it'),
    ('admin@wintertuscanycamp.it'),
    ('ubaldocecamore@inwind.it')
ON CONFLICT (email) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2. FUNZIONE HELPER: controlla se l'utente corrente è admin
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins
        WHERE lower(email) = lower(auth.jwt() ->> 'email')
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
-- 10. PERMESSI FUNZIONE & KEEP ALIVE
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.keep_alive()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT true;
$$;

GRANT EXECUTE ON FUNCTION public.keep_alive() TO anon;
GRANT EXECUTE ON FUNCTION public.keep_alive() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 11. STORAGE BUCKET & RLS POLICIES (pdf_downloads)
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdf_downloads', 'pdf_downloads', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS "Allow Public Downloads" ON storage.objects;
CREATE POLICY "Allow Public Downloads" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'pdf_downloads');

DROP POLICY IF EXISTS "Allow Authenticated Uploads" ON storage.objects;
CREATE POLICY "Allow Authenticated Uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'pdf_downloads');

DROP POLICY IF EXISTS "Allow Authenticated Updates" ON storage.objects;
CREATE POLICY "Allow Authenticated Updates" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'pdf_downloads')
    WITH CHECK (bucket_id = 'pdf_downloads');

DROP POLICY IF EXISTS "Allow Authenticated Deletes" ON storage.objects;
CREATE POLICY "Allow Authenticated Deletes" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'pdf_downloads');
