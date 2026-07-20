-- ══════════════════════════════════════════════════════════════════════════
--  RLS-Härtung · Phase 5 · Einladungs-Tokens nicht mehr breit lesbar
--
--  Befund (Audit): Auf public.invitations existiert eine SELECT-Policy ohne
--  Token-Bindung — jeder eingeloggte Nutzer konnte ALLE offenen Einladungen
--  (email, role, token) lesen. Ein geleakter Token + register-with-invitation
--  = fremdes Konto anlegen.
--
--  Fix: Die breite Lese-Policy entfernen. Die Registrierung prüft den Token
--  ohnehin server-seitig in der Edge Function register-with-invitation
--  (service_role, umgeht RLS) — es geht also kein legitimer Ablauf verloren.
--  Admin-Verwaltungs-Policies auf invitations bleiben bestehen.
--
--  Idempotent.
-- ══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.invitations;

-- Falls unter leicht abweichendem Namen vorhanden (defensiv):
DROP POLICY IF EXISTS "Anyone can read invitations by token" ON public.invitations;
