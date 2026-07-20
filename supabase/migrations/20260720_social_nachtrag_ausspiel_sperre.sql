-- Nachtrag zu 20260719_social_agent.sql (bereits eingespielt — daher eigene Datei).
--
-- PROBLEM: Zwei Wege koennen denselben Post gleichzeitig ausspielen — ein manueller
-- Klick in der Oberflaeche und ein faelliger Kalender-Eintrag, den der 15-Minuten-Cron
-- aufgreift. Beide lesen status='freigegeben', beide rufen die Plattform auf, der Post
-- erscheint zweimal. Auf einem Firmenkanal ist das sichtbar peinlich und nicht loeschbar,
-- ohne dass es jemand mitbekommen hat.
--
-- LOESUNG: Eine Reservierung. Wer ausspielen will, setzt zuerst per bedingtem Update
-- ausspielung_laeuft_seit. Gelingt das Update nicht (weil schon jemand reserviert hat),
-- bricht der zweite Aufrufer ab, bevor die Plattform kontaktiert wird.
--
-- Bewusst KEIN Statuswechsel als Reservierung: 'veroeffentlicht' darf weiterhin erst
-- nach bestaetigter Plattform-Antwort gesetzt werden (Kernregel des Systems).

alter table public.social_posts
  add column if not exists ausspielung_laeuft_seit timestamptz;

comment on column public.social_posts.ausspielung_laeuft_seit is
  'Reservierung fuer die Ausspielung. Von social-publish per bedingtem Update gesetzt, damit ein Post nicht gleichzeitig manuell und per Zeitplan veroeffentlicht wird. Wird nach Abschluss (Erfolg wie Fehlschlag) wieder auf null gesetzt; ein aelterer Wert als 10 Minuten gilt als verwaist (abgestuerzte Function) und darf ueberschrieben werden.';

-- Die Inhaltssperre aus dem Trigger darf an dieser Spalte nicht anschlagen:
-- sie ist Betriebszustand, kein Inhalt. Der Trigger prueft ohnehin nur
-- inhalt/plattform/quellen_urls/topic_id/freigegeben_*, also ist nichts anzupassen —
-- dieser Kommentar haelt nur fest, dass das geprueft wurde.
