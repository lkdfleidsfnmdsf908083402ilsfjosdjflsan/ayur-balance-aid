export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      abwesenheiten: {
        Row: {
          aktualisiert_am: string | null
          bemerkung: string | null
          bis_datum: string
          erstellt_am: string | null
          genehmigt_von: string | null
          id: string
          mitarbeiter_id: string
          status: string | null
          typ: string
          von_datum: string
        }
        Insert: {
          aktualisiert_am?: string | null
          bemerkung?: string | null
          bis_datum: string
          erstellt_am?: string | null
          genehmigt_von?: string | null
          id?: string
          mitarbeiter_id: string
          status?: string | null
          typ: string
          von_datum: string
        }
        Update: {
          aktualisiert_am?: string | null
          bemerkung?: string | null
          bis_datum?: string
          erstellt_am?: string | null
          genehmigt_von?: string | null
          id?: string
          mitarbeiter_id?: string
          status?: string | null
          typ?: string
          von_datum?: string
        }
        Relationships: [
          {
            foreignKeyName: "abwesenheiten_mitarbeiter_id_fkey"
            columns: ["mitarbeiter_id"]
            isOneToOne: false
            referencedRelation: "mitarbeiter"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_abnahme_protokoll: {
        Row: {
          abgenommen_von: string
          auto_id: string
          bemerkungen: string | null
          bereich_anlage: string | null
          check_1: string | null
          check_2: string | null
          check_3: string | null
          check_4: string | null
          check_5: string | null
          check_6: string | null
          created_at: string | null
          datum: string
          id: string
          massnahme: string | null
          source_id: string
          source_table: string
        }
        Insert: {
          abgenommen_von: string
          auto_id: string
          bemerkungen?: string | null
          bereich_anlage?: string | null
          check_1?: string | null
          check_2?: string | null
          check_3?: string | null
          check_4?: string | null
          check_5?: string | null
          check_6?: string | null
          created_at?: string | null
          datum?: string
          id?: string
          massnahme?: string | null
          source_id: string
          source_table: string
        }
        Update: {
          abgenommen_von?: string
          auto_id?: string
          bemerkungen?: string | null
          bereich_anlage?: string | null
          check_1?: string | null
          check_2?: string | null
          check_3?: string | null
          check_4?: string | null
          check_5?: string | null
          check_6?: string | null
          created_at?: string | null
          datum?: string
          id?: string
          massnahme?: string | null
          source_id?: string
          source_table?: string
        }
        Relationships: []
      }
      admin_calendar_settings: {
        Row: {
          calendar_type: string | null
          email_1: string | null
          email_2: string | null
          email_3: string | null
          id: string
          reminder_days_before: number | null
          updated_at: string | null
        }
        Insert: {
          calendar_type?: string | null
          email_1?: string | null
          email_2?: string | null
          email_3?: string | null
          id?: string
          reminder_days_before?: number | null
          updated_at?: string | null
        }
        Update: {
          calendar_type?: string | null
          email_1?: string | null
          email_2?: string | null
          email_3?: string | null
          id?: string
          reminder_days_before?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_reminder_log: {
        Row: {
          auto_id: string
          error_message: string | null
          faellig_am: string
          id: string
          reminder_type: string | null
          sent_at: string | null
          sent_to_email_1: boolean | null
          sent_to_email_2: boolean | null
          sent_to_email_3: boolean | null
          source_id: string
          source_table: string
        }
        Insert: {
          auto_id: string
          error_message?: string | null
          faellig_am: string
          id?: string
          reminder_type?: string | null
          sent_at?: string | null
          sent_to_email_1?: boolean | null
          sent_to_email_2?: boolean | null
          sent_to_email_3?: boolean | null
          source_id: string
          source_table: string
        }
        Update: {
          auto_id?: string
          error_message?: string | null
          faellig_am?: string
          id?: string
          reminder_type?: string | null
          sent_at?: string | null
          sent_to_email_1?: boolean | null
          sent_to_email_2?: boolean | null
          sent_to_email_3?: boolean | null
          source_id?: string
          source_table?: string
        }
        Relationships: []
      }
      admin_reparaturen: {
        Row: {
          abgenommen_von: string | null
          abnahme_notiz: string | null
          auto_id: string | null
          bereich_anlage: string
          calendar_event_created: boolean | null
          calendar_event_id: string | null
          check_1: string | null
          check_2: string | null
          check_3: string | null
          check_4: string | null
          check_5: string | null
          check_6: string | null
          created_at: string
          dringlichkeit: string | null
          erledigt_am: string | null
          faellig_am: string | null
          geplant: string | null
          id: string
          kategorie: string | null
          kosten_geschaetzt: number | null
          massnahme: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          risiko_bei_verzug: string | null
          row_number: number
          status: string | null
          updated_at: string | null
          versicherung_relevant: string | null
          zustaendig: string | null
        }
        Insert: {
          abgenommen_von?: string | null
          abnahme_notiz?: string | null
          auto_id?: string | null
          bereich_anlage: string
          calendar_event_created?: boolean | null
          calendar_event_id?: string | null
          check_1?: string | null
          check_2?: string | null
          check_3?: string | null
          check_4?: string | null
          check_5?: string | null
          check_6?: string | null
          created_at?: string
          dringlichkeit?: string | null
          erledigt_am?: string | null
          faellig_am?: string | null
          geplant?: string | null
          id?: string
          kategorie?: string | null
          kosten_geschaetzt?: number | null
          massnahme?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          risiko_bei_verzug?: string | null
          row_number?: number
          status?: string | null
          updated_at?: string | null
          versicherung_relevant?: string | null
          zustaendig?: string | null
        }
        Update: {
          abgenommen_von?: string | null
          abnahme_notiz?: string | null
          auto_id?: string | null
          bereich_anlage?: string
          calendar_event_created?: boolean | null
          calendar_event_id?: string | null
          check_1?: string | null
          check_2?: string | null
          check_3?: string | null
          check_4?: string | null
          check_5?: string | null
          check_6?: string | null
          created_at?: string
          dringlichkeit?: string | null
          erledigt_am?: string | null
          faellig_am?: string | null
          geplant?: string | null
          id?: string
          kategorie?: string | null
          kosten_geschaetzt?: number | null
          massnahme?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          risiko_bei_verzug?: string | null
          row_number?: number
          status?: string | null
          updated_at?: string | null
          versicherung_relevant?: string | null
          zustaendig?: string | null
        }
        Relationships: []
      }
      admin_tuev_wartungen: {
        Row: {
          abgenommen_von: string | null
          abnahme_notiz: string | null
          auto_id: string | null
          bereich_anlage: string
          calendar_event_created: boolean | null
          calendar_event_id: string | null
          check_1: string | null
          check_2: string | null
          check_3: string | null
          check_4: string | null
          check_5: string | null
          check_6: string | null
          created_at: string
          dienstleister: string | null
          erledigt_am: string | null
          faellig_am: string | null
          gesetzlich: string | null
          id: string
          intervall: string | null
          kosten_geschaetzt: number | null
          letzte_durchfuehrung: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          risiko_bei_verzug: string | null
          row_number: number
          status: string | null
          updated_at: string | null
          wartung_pruefung: string | null
          zustaendig: string | null
        }
        Insert: {
          abgenommen_von?: string | null
          abnahme_notiz?: string | null
          auto_id?: string | null
          bereich_anlage: string
          calendar_event_created?: boolean | null
          calendar_event_id?: string | null
          check_1?: string | null
          check_2?: string | null
          check_3?: string | null
          check_4?: string | null
          check_5?: string | null
          check_6?: string | null
          created_at?: string
          dienstleister?: string | null
          erledigt_am?: string | null
          faellig_am?: string | null
          gesetzlich?: string | null
          id?: string
          intervall?: string | null
          kosten_geschaetzt?: number | null
          letzte_durchfuehrung?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          risiko_bei_verzug?: string | null
          row_number?: number
          status?: string | null
          updated_at?: string | null
          wartung_pruefung?: string | null
          zustaendig?: string | null
        }
        Update: {
          abgenommen_von?: string | null
          abnahme_notiz?: string | null
          auto_id?: string | null
          bereich_anlage?: string
          calendar_event_created?: boolean | null
          calendar_event_id?: string | null
          check_1?: string | null
          check_2?: string | null
          check_3?: string | null
          check_4?: string | null
          check_5?: string | null
          check_6?: string | null
          created_at?: string
          dienstleister?: string | null
          erledigt_am?: string | null
          faellig_am?: string | null
          gesetzlich?: string | null
          id?: string
          intervall?: string | null
          kosten_geschaetzt?: number | null
          letzte_durchfuehrung?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          risiko_bei_verzug?: string | null
          row_number?: number
          status?: string | null
          updated_at?: string | null
          wartung_pruefung?: string | null
          zustaendig?: string | null
        }
        Relationships: []
      }
      admin_versicherungen: {
        Row: {
          abgenommen_von: string | null
          abnahme_notiz: string | null
          aktenzeichen: string | null
          aktueller_stand: string | null
          auto_id: string | null
          bereich_anlage: string
          calendar_event_created: boolean | null
          calendar_event_id: string | null
          check_1: string | null
          check_2: string | null
          check_3: string | null
          check_4: string | null
          check_5: string | null
          check_6: string | null
          created_at: string
          datum_meldung: string | null
          erledigt_am: string | null
          erstattet: number | null
          faellig_am: string | null
          id: string
          kosten_geschaetzt: number | null
          naechster_schritt: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          row_number: number
          schaden_gemeldet: string | null
          status: string | null
          updated_at: string | null
          versicherungsart: string | null
          zustaendig: string | null
        }
        Insert: {
          abgenommen_von?: string | null
          abnahme_notiz?: string | null
          aktenzeichen?: string | null
          aktueller_stand?: string | null
          auto_id?: string | null
          bereich_anlage: string
          calendar_event_created?: boolean | null
          calendar_event_id?: string | null
          check_1?: string | null
          check_2?: string | null
          check_3?: string | null
          check_4?: string | null
          check_5?: string | null
          check_6?: string | null
          created_at?: string
          datum_meldung?: string | null
          erledigt_am?: string | null
          erstattet?: number | null
          faellig_am?: string | null
          id?: string
          kosten_geschaetzt?: number | null
          naechster_schritt?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          row_number?: number
          schaden_gemeldet?: string | null
          status?: string | null
          updated_at?: string | null
          versicherungsart?: string | null
          zustaendig?: string | null
        }
        Update: {
          abgenommen_von?: string | null
          abnahme_notiz?: string | null
          aktenzeichen?: string | null
          aktueller_stand?: string | null
          auto_id?: string | null
          bereich_anlage?: string
          calendar_event_created?: boolean | null
          calendar_event_id?: string | null
          check_1?: string | null
          check_2?: string | null
          check_3?: string | null
          check_4?: string | null
          check_5?: string | null
          check_6?: string | null
          created_at?: string
          datum_meldung?: string | null
          erledigt_am?: string | null
          erstattet?: number | null
          faellig_am?: string | null
          id?: string
          kosten_geschaetzt?: number | null
          naechster_schritt?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          row_number?: number
          schaden_gemeldet?: string | null
          status?: string | null
          updated_at?: string | null
          versicherungsart?: string | null
          zustaendig?: string | null
        }
        Relationships: []
      }
      betriebskalender: {
        Row: {
          datum: string
          grund: string | null
          ist_geoeffnet: boolean
        }
        Insert: {
          datum: string
          grund?: string | null
          ist_geoeffnet?: boolean
        }
        Update: {
          datum?: string
          grund?: string | null
          ist_geoeffnet?: boolean
        }
        Relationships: []
      }
      budget_planung: {
        Row: {
          abteilung: string
          betriebsaufwand_budget: number | null
          created_at: string | null
          db1_budget: number | null
          db2_budget: number | null
          energie_budget: number | null
          gop1_budget: number | null
          gop2_budget: number | null
          id: string
          jahr: number
          marketing_budget: number | null
          monat: number | null
          personal_budget: number | null
          umsatz_budget: number | null
          updated_at: string | null
          wareneinsatz_budget: number | null
        }
        Insert: {
          abteilung: string
          betriebsaufwand_budget?: number | null
          created_at?: string | null
          db1_budget?: number | null
          db2_budget?: number | null
          energie_budget?: number | null
          gop1_budget?: number | null
          gop2_budget?: number | null
          id?: string
          jahr: number
          marketing_budget?: number | null
          monat?: number | null
          personal_budget?: number | null
          umsatz_budget?: number | null
          updated_at?: string | null
          wareneinsatz_budget?: number | null
        }
        Update: {
          abteilung?: string
          betriebsaufwand_budget?: number | null
          created_at?: string | null
          db1_budget?: number | null
          db2_budget?: number | null
          energie_budget?: number | null
          gop1_budget?: number | null
          gop2_budget?: number | null
          id?: string
          jahr?: number
          marketing_budget?: number | null
          monat?: number | null
          personal_budget?: number | null
          umsatz_budget?: number | null
          updated_at?: string | null
          wareneinsatz_budget?: number | null
        }
        Relationships: []
      }
      budget_ziele: {
        Row: {
          abteilung: string
          aktualisiert_am: string | null
          bemerkung: string | null
          erstellt_am: string | null
          id: string
          jahr: number
          monat: number
          ziel_aufwand: number | null
          ziel_db1: number | null
          ziel_db2: number | null
          ziel_erloese: number | null
          ziel_rohertrag: number | null
        }
        Insert: {
          abteilung: string
          aktualisiert_am?: string | null
          bemerkung?: string | null
          erstellt_am?: string | null
          id?: string
          jahr: number
          monat: number
          ziel_aufwand?: number | null
          ziel_db1?: number | null
          ziel_db2?: number | null
          ziel_erloese?: number | null
          ziel_rohertrag?: number | null
        }
        Update: {
          abteilung?: string
          aktualisiert_am?: string | null
          bemerkung?: string | null
          erstellt_am?: string | null
          id?: string
          jahr?: number
          monat?: number
          ziel_aufwand?: number | null
          ziel_db1?: number | null
          ziel_db2?: number | null
          ziel_erloese?: number | null
          ziel_rohertrag?: number | null
        }
        Relationships: []
      }
      calendar_tokens: {
        Row: {
          access_level: string
          active: boolean | null
          created_at: string | null
          department: string | null
          id: string
          is_abteilungsleiter: boolean | null
          last_used_at: string | null
          mitarbeiter_id: string | null
          name: string
          notes: string | null
          token: string
        }
        Insert: {
          access_level?: string
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          id?: string
          is_abteilungsleiter?: boolean | null
          last_used_at?: string | null
          mitarbeiter_id?: string | null
          name: string
          notes?: string | null
          token: string
        }
        Update: {
          access_level?: string
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          id?: string
          is_abteilungsleiter?: boolean | null
          last_used_at?: string | null
          mitarbeiter_id?: string | null
          name?: string
          notes?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_tokens_mitarbeiter_id_fkey"
            columns: ["mitarbeiter_id"]
            isOneToOne: false
            referencedRelation: "mitarbeiter"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          abwesenheit: string
          created_at: string
          datum: string
          employee_id: string
          id: string
          ist_stunden: number | null
          nachmittag_beginn: string | null
          nachmittag_ende: string | null
          schicht_beginn: string | null
          schicht_ende: string | null
          soll_stunden: number
          ueberstunden: number | null
          updated_at: string
          vormittag_beginn: string | null
          vormittag_ende: string | null
        }
        Insert: {
          abwesenheit?: string
          created_at?: string
          datum: string
          employee_id: string
          id?: string
          ist_stunden?: number | null
          nachmittag_beginn?: string | null
          nachmittag_ende?: string | null
          schicht_beginn?: string | null
          schicht_ende?: string | null
          soll_stunden?: number
          ueberstunden?: number | null
          updated_at?: string
          vormittag_beginn?: string | null
          vormittag_ende?: string | null
        }
        Update: {
          abwesenheit?: string
          created_at?: string
          datum?: string
          employee_id?: string
          id?: string
          ist_stunden?: number | null
          nachmittag_beginn?: string | null
          nachmittag_ende?: string | null
          schicht_beginn?: string | null
          schicht_ende?: string | null
          soll_stunden?: number
          ueberstunden?: number | null
          updated_at?: string
          vormittag_beginn?: string | null
          vormittag_ende?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_balances: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          jahr: number
          krankheitstage: number
          monat: number
          ueberstunden_abgebaut: number
          ueberstunden_neu: number
          ueberstunden_saldo: number
          updated_at: string
          urlaub_anspruch_tage: number
          urlaub_genommen_tage: number
          urlaub_rest_tage: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          jahr: number
          krankheitstage?: number
          monat: number
          ueberstunden_abgebaut?: number
          ueberstunden_neu?: number
          ueberstunden_saldo?: number
          updated_at?: string
          urlaub_anspruch_tage?: number
          urlaub_genommen_tage?: number
          urlaub_rest_tage?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          jahr?: number
          krankheitstage?: number
          monat?: number
          ueberstunden_abgebaut?: number
          ueberstunden_neu?: number
          ueberstunden_saldo?: number
          updated_at?: string
          urlaub_anspruch_tage?: number
          urlaub_genommen_tage?: number
          urlaub_rest_tage?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          abteilung: string
          aktiv: boolean
          anstellungsart: string | null
          austrittsdatum: string | null
          brutto_monat: number | null
          created_at: string
          eintrittsdatum: string
          email: string | null
          gesamtaufwand_monat: number | null
          gesamtkosten_monat: number | null
          id: string
          lohnnebenkosten_pct: number | null
          nachname: string
          personalnr: string | null
          personalnummer: string
          position: string | null
          stundenlohn: number
          telefon: string | null
          updated_at: string
          vorname: string
          wochenstunden_soll: number
        }
        Insert: {
          abteilung: string
          aktiv?: boolean
          anstellungsart?: string | null
          austrittsdatum?: string | null
          brutto_monat?: number | null
          created_at?: string
          eintrittsdatum?: string
          email?: string | null
          gesamtaufwand_monat?: number | null
          gesamtkosten_monat?: number | null
          id?: string
          lohnnebenkosten_pct?: number | null
          nachname: string
          personalnr?: string | null
          personalnummer: string
          position?: string | null
          stundenlohn?: number
          telefon?: string | null
          updated_at?: string
          vorname: string
          wochenstunden_soll?: number
        }
        Update: {
          abteilung?: string
          aktiv?: boolean
          anstellungsart?: string | null
          austrittsdatum?: string | null
          brutto_monat?: number | null
          created_at?: string
          eintrittsdatum?: string
          email?: string | null
          gesamtaufwand_monat?: number | null
          gesamtkosten_monat?: number | null
          id?: string
          lohnnebenkosten_pct?: number | null
          nachname?: string
          personalnr?: string | null
          personalnummer?: string
          position?: string | null
          stundenlohn?: number
          telefon?: string | null
          updated_at?: string
          vorname?: string
          wochenstunden_soll?: number
        }
        Relationships: []
      }
      employees_history: {
        Row: {
          abteilung: string | null
          aktiv: boolean | null
          brutto_monat: number | null
          created_at: string | null
          gesamtaufwand_monat: number | null
          gesamtaufwand_normalisiert: number | null
          id: number
          ist_doppelmonat: boolean | null
          jahr: number
          monat: number
          nachname: string | null
          personalnummer: string
          position: string | null
          vorname: string | null
        }
        Insert: {
          abteilung?: string | null
          aktiv?: boolean | null
          brutto_monat?: number | null
          created_at?: string | null
          gesamtaufwand_monat?: number | null
          gesamtaufwand_normalisiert?: number | null
          id?: number
          ist_doppelmonat?: boolean | null
          jahr: number
          monat: number
          nachname?: string | null
          personalnummer: string
          position?: string | null
          vorname?: string | null
        }
        Update: {
          abteilung?: string | null
          aktiv?: boolean | null
          brutto_monat?: number | null
          created_at?: string | null
          gesamtaufwand_monat?: number | null
          gesamtaufwand_normalisiert?: number | null
          id?: number
          ist_doppelmonat?: boolean | null
          jahr?: number
          monat?: number
          nachname?: string | null
          personalnummer?: string
          position?: string | null
          vorname?: string | null
        }
        Relationships: []
      }
      erstanamnese: {
        Row: {
          allergie_1: string | null
          allergie_2: string | null
          allergie_3: string | null
          allergie_4: string | null
          allergie_5: string | null
          allergien_freitext: string | null
          alter_jahre: number | null
          arzt: string | null
          beruf: string | null
          beschwerden: string | null
          blutdruck: string | null
          blutwerte_jahr: string | null
          created_at: string | null
          datum: string | null
          diagnose: string | null
          emotional: string | null
          familienname: string | null
          familienstand: string | null
          fruehgeburt: boolean | null
          geburtsdatum: string | null
          gewicht_kg: number | null
          groesse_cm: number | null
          id: string
          info_abteilung: string | null
          kinder: string | null
          kraeuter: string | null
          kraeuter_erledigt_von: string | null
          kraft_abwehr: string | null
          kraft_abwehr_seit: string | null
          kraft_koerperlich: string | null
          kraft_koerperlich_seit: string | null
          krankheiten_mutter: string | null
          krankheiten_vater: string | null
          kur_typ: string | null
          medikamente: string | null
          mutter_lebt: boolean | null
          operationen: string | null
          paket: string | null
          psych_aengstlich: boolean | null
          psych_ausgeglichen: boolean | null
          psych_dankbar: boolean | null
          psych_depressiv: boolean | null
          psych_einsam: boolean | null
          psych_erschoepft: boolean | null
          psych_freudig: boolean | null
          psych_gelassen: boolean | null
          psych_gestresst: boolean | null
          psych_gleichgueltig: boolean | null
          psych_hauptzustand: string | null
          psych_hoffnungsvoll: boolean | null
          psych_kummer: boolean | null
          psych_motiviert: boolean | null
          psych_nebenzustand: string | null
          psych_nervoes: boolean | null
          psych_rastlos: boolean | null
          psych_reizbar: boolean | null
          psych_traumatisiert: boolean | null
          psych_traurig: boolean | null
          psych_ueberfordert: boolean | null
          psych_verwirrt: boolean | null
          psych_zufrieden: boolean | null
          puls: string | null
          schwerpunkt_ziel: string | null
          signatur_datum: string | null
          sprache: string | null
          status: string | null
          unvertr_1: string | null
          unvertr_2: string | null
          unvertr_3: string | null
          unvertr_4: string | null
          unvertr_5: string | null
          unvertr_freitext: string | null
          updated_at: string | null
          vater_lebt: boolean | null
          vorname: string | null
          zungendiagnose: string | null
        }
        Insert: {
          allergie_1?: string | null
          allergie_2?: string | null
          allergie_3?: string | null
          allergie_4?: string | null
          allergie_5?: string | null
          allergien_freitext?: string | null
          alter_jahre?: number | null
          arzt?: string | null
          beruf?: string | null
          beschwerden?: string | null
          blutdruck?: string | null
          blutwerte_jahr?: string | null
          created_at?: string | null
          datum?: string | null
          diagnose?: string | null
          emotional?: string | null
          familienname?: string | null
          familienstand?: string | null
          fruehgeburt?: boolean | null
          geburtsdatum?: string | null
          gewicht_kg?: number | null
          groesse_cm?: number | null
          id?: string
          info_abteilung?: string | null
          kinder?: string | null
          kraeuter?: string | null
          kraeuter_erledigt_von?: string | null
          kraft_abwehr?: string | null
          kraft_abwehr_seit?: string | null
          kraft_koerperlich?: string | null
          kraft_koerperlich_seit?: string | null
          krankheiten_mutter?: string | null
          krankheiten_vater?: string | null
          kur_typ?: string | null
          medikamente?: string | null
          mutter_lebt?: boolean | null
          operationen?: string | null
          paket?: string | null
          psych_aengstlich?: boolean | null
          psych_ausgeglichen?: boolean | null
          psych_dankbar?: boolean | null
          psych_depressiv?: boolean | null
          psych_einsam?: boolean | null
          psych_erschoepft?: boolean | null
          psych_freudig?: boolean | null
          psych_gelassen?: boolean | null
          psych_gestresst?: boolean | null
          psych_gleichgueltig?: boolean | null
          psych_hauptzustand?: string | null
          psych_hoffnungsvoll?: boolean | null
          psych_kummer?: boolean | null
          psych_motiviert?: boolean | null
          psych_nebenzustand?: string | null
          psych_nervoes?: boolean | null
          psych_rastlos?: boolean | null
          psych_reizbar?: boolean | null
          psych_traumatisiert?: boolean | null
          psych_traurig?: boolean | null
          psych_ueberfordert?: boolean | null
          psych_verwirrt?: boolean | null
          psych_zufrieden?: boolean | null
          puls?: string | null
          schwerpunkt_ziel?: string | null
          signatur_datum?: string | null
          sprache?: string | null
          status?: string | null
          unvertr_1?: string | null
          unvertr_2?: string | null
          unvertr_3?: string | null
          unvertr_4?: string | null
          unvertr_5?: string | null
          unvertr_freitext?: string | null
          updated_at?: string | null
          vater_lebt?: boolean | null
          vorname?: string | null
          zungendiagnose?: string | null
        }
        Update: {
          allergie_1?: string | null
          allergie_2?: string | null
          allergie_3?: string | null
          allergie_4?: string | null
          allergie_5?: string | null
          allergien_freitext?: string | null
          alter_jahre?: number | null
          arzt?: string | null
          beruf?: string | null
          beschwerden?: string | null
          blutdruck?: string | null
          blutwerte_jahr?: string | null
          created_at?: string | null
          datum?: string | null
          diagnose?: string | null
          emotional?: string | null
          familienname?: string | null
          familienstand?: string | null
          fruehgeburt?: boolean | null
          geburtsdatum?: string | null
          gewicht_kg?: number | null
          groesse_cm?: number | null
          id?: string
          info_abteilung?: string | null
          kinder?: string | null
          kraeuter?: string | null
          kraeuter_erledigt_von?: string | null
          kraft_abwehr?: string | null
          kraft_abwehr_seit?: string | null
          kraft_koerperlich?: string | null
          kraft_koerperlich_seit?: string | null
          krankheiten_mutter?: string | null
          krankheiten_vater?: string | null
          kur_typ?: string | null
          medikamente?: string | null
          mutter_lebt?: boolean | null
          operationen?: string | null
          paket?: string | null
          psych_aengstlich?: boolean | null
          psych_ausgeglichen?: boolean | null
          psych_dankbar?: boolean | null
          psych_depressiv?: boolean | null
          psych_einsam?: boolean | null
          psych_erschoepft?: boolean | null
          psych_freudig?: boolean | null
          psych_gelassen?: boolean | null
          psych_gestresst?: boolean | null
          psych_gleichgueltig?: boolean | null
          psych_hauptzustand?: string | null
          psych_hoffnungsvoll?: boolean | null
          psych_kummer?: boolean | null
          psych_motiviert?: boolean | null
          psych_nebenzustand?: string | null
          psych_nervoes?: boolean | null
          psych_rastlos?: boolean | null
          psych_reizbar?: boolean | null
          psych_traumatisiert?: boolean | null
          psych_traurig?: boolean | null
          psych_ueberfordert?: boolean | null
          psych_verwirrt?: boolean | null
          psych_zufrieden?: boolean | null
          puls?: string | null
          schwerpunkt_ziel?: string | null
          signatur_datum?: string | null
          sprache?: string | null
          status?: string | null
          unvertr_1?: string | null
          unvertr_2?: string | null
          unvertr_3?: string | null
          unvertr_4?: string | null
          unvertr_5?: string | null
          unvertr_freitext?: string | null
          updated_at?: string | null
          vater_lebt?: boolean | null
          vorname?: string | null
          zungendiagnose?: string | null
        }
        Relationships: []
      }
      frontdesk_daily_reports: {
        Row: {
          adr: number | null
          cancellations: number | null
          checkins_today: number | null
          checkouts_today: number | null
          complaints: number | null
          created_at: string | null
          guests_absent: number | null
          guests_total: number | null
          id: string
          noshow_rate_pct: number | null
          noshows: number | null
          occupancy_pct: number | null
          report_date: string
          revpar: number | null
          room_revenue: number | null
          rooms_occupied: number | null
          staff_count: number | null
          total_rooms: number | null
          walkins: number | null
        }
        Insert: {
          adr?: number | null
          cancellations?: number | null
          checkins_today?: number | null
          checkouts_today?: number | null
          complaints?: number | null
          created_at?: string | null
          guests_absent?: number | null
          guests_total?: number | null
          id?: string
          noshow_rate_pct?: number | null
          noshows?: number | null
          occupancy_pct?: number | null
          report_date: string
          revpar?: number | null
          room_revenue?: number | null
          rooms_occupied?: number | null
          staff_count?: number | null
          total_rooms?: number | null
          walkins?: number | null
        }
        Update: {
          adr?: number | null
          cancellations?: number | null
          checkins_today?: number | null
          checkouts_today?: number | null
          complaints?: number | null
          created_at?: string | null
          guests_absent?: number | null
          guests_total?: number | null
          id?: string
          noshow_rate_pct?: number | null
          noshows?: number | null
          occupancy_pct?: number | null
          report_date?: string
          revpar?: number | null
          room_revenue?: number | null
          rooms_occupied?: number | null
          staff_count?: number | null
          total_rooms?: number | null
          walkins?: number | null
        }
        Relationships: []
      }
      housekeeping_daily_reports: {
        Row: {
          avg_time_per_room: number | null
          checkouts_today: number | null
          cleaning_rate_pct: number | null
          cleaning_supplies_cost_week: number | null
          complaint_rate_pct: number | null
          complaints: number | null
          created_at: string | null
          deep_cleans: number | null
          id: string
          laundry_kg_week: number | null
          reclean_rate_pct: number | null
          report_date: string
          rooms_cleaned: number | null
          rooms_per_employee: number | null
          rooms_recleaned: number | null
          rooms_to_clean: number | null
          staff_count: number | null
          stayovers: number | null
          total_hours: number | null
        }
        Insert: {
          avg_time_per_room?: number | null
          checkouts_today?: number | null
          cleaning_rate_pct?: number | null
          cleaning_supplies_cost_week?: number | null
          complaint_rate_pct?: number | null
          complaints?: number | null
          created_at?: string | null
          deep_cleans?: number | null
          id?: string
          laundry_kg_week?: number | null
          reclean_rate_pct?: number | null
          report_date: string
          rooms_cleaned?: number | null
          rooms_per_employee?: number | null
          rooms_recleaned?: number | null
          rooms_to_clean?: number | null
          staff_count?: number | null
          stayovers?: number | null
          total_hours?: number | null
        }
        Update: {
          avg_time_per_room?: number | null
          checkouts_today?: number | null
          cleaning_rate_pct?: number | null
          cleaning_supplies_cost_week?: number | null
          complaint_rate_pct?: number | null
          complaints?: number | null
          created_at?: string | null
          deep_cleans?: number | null
          id?: string
          laundry_kg_week?: number | null
          reclean_rate_pct?: number | null
          report_date?: string
          rooms_cleaned?: number | null
          rooms_per_employee?: number | null
          rooms_recleaned?: number | null
          rooms_to_clean?: number | null
          staff_count?: number | null
          stayovers?: number | null
          total_hours?: number | null
        }
        Relationships: []
      }
      import_files: {
        Row: {
          anzahl_konten: number | null
          filename: string
          id: string
          imported_at: string | null
          jahr: number
          monat: number
        }
        Insert: {
          anzahl_konten?: number | null
          filename: string
          id?: string
          imported_at?: string | null
          jahr: number
          monat: number
        }
        Update: {
          anzahl_konten?: number | null
          filename?: string
          id?: string
          imported_at?: string | null
          jahr?: number
          monat?: number
        }
        Relationships: []
      }
      influencer_stays: {
        Row: {
          allergien: string | null
          begleitung: string | null
          bis: string | null
          created_at: string | null
          follower: string | null
          herkunft: string | null
          id: string
          kanaele: string | null
          kurtyp: string | null
          name: string
          notizen: string | null
          themen: string | null
          von: string | null
          vorlieben: string | null
          wieder: boolean | null
          wuensche: string | null
        }
        Insert: {
          allergien?: string | null
          begleitung?: string | null
          bis?: string | null
          created_at?: string | null
          follower?: string | null
          herkunft?: string | null
          id?: string
          kanaele?: string | null
          kurtyp?: string | null
          name: string
          notizen?: string | null
          themen?: string | null
          von?: string | null
          vorlieben?: string | null
          wieder?: boolean | null
          wuensche?: string | null
        }
        Update: {
          allergien?: string | null
          begleitung?: string | null
          bis?: string | null
          created_at?: string | null
          follower?: string | null
          herkunft?: string | null
          id?: string
          kanaele?: string | null
          kurtyp?: string | null
          name?: string
          notizen?: string | null
          themen?: string | null
          von?: string | null
          vorlieben?: string | null
          wieder?: boolean | null
          wuensche?: string | null
        }
        Relationships: []
      }
      kitchen_daily_reports: {
        Row: {
          base_cpc: number | null
          beverage_cost_week: number
          covers_breakfast: number
          covers_dinner: number
          covers_lunch: number
          covers_total: number
          cpc_breakfast: number | null
          cpc_dinner: number | null
          cpc_lunch: number | null
          cpgd: number | null
          created_at: string
          food_complaints: number
          food_cost_week: number
          guests_absent: number
          id: string
          kitchen_hours_total: number
          kitchen_staff_count: number
          meals_per_employee: number | null
          report_date: string
          updated_at: string
          waste_pct: number | null
          waste_value_week: number
          weighted_covers: number
        }
        Insert: {
          base_cpc?: number | null
          beverage_cost_week?: number
          covers_breakfast?: number
          covers_dinner?: number
          covers_lunch?: number
          covers_total?: number
          cpc_breakfast?: number | null
          cpc_dinner?: number | null
          cpc_lunch?: number | null
          cpgd?: number | null
          created_at?: string
          food_complaints?: number
          food_cost_week?: number
          guests_absent?: number
          id?: string
          kitchen_hours_total?: number
          kitchen_staff_count?: number
          meals_per_employee?: number | null
          report_date: string
          updated_at?: string
          waste_pct?: number | null
          waste_value_week?: number
          weighted_covers?: number
        }
        Update: {
          base_cpc?: number | null
          beverage_cost_week?: number
          covers_breakfast?: number
          covers_dinner?: number
          covers_lunch?: number
          covers_total?: number
          cpc_breakfast?: number | null
          cpc_dinner?: number | null
          cpc_lunch?: number | null
          cpgd?: number | null
          created_at?: string
          food_complaints?: number
          food_cost_week?: number
          guests_absent?: number
          id?: string
          kitchen_hours_total?: number
          kitchen_staff_count?: number
          meals_per_employee?: number | null
          report_date?: string
          updated_at?: string
          waste_pct?: number | null
          waste_value_week?: number
          weighted_covers?: number
        }
        Relationships: []
      }
      konten: {
        Row: {
          bereich: string | null
          created_at: string | null
          id: string
          kontobezeichnung: string | null
          kontoklasse: string | null
          kontonummer: string
          kostenartt_typ: string | null
          kpi_kategorie: string | null
        }
        Insert: {
          bereich?: string | null
          created_at?: string | null
          id?: string
          kontobezeichnung?: string | null
          kontoklasse?: string | null
          kontonummer: string
          kostenartt_typ?: string | null
          kpi_kategorie?: string | null
        }
        Update: {
          bereich?: string | null
          created_at?: string | null
          id?: string
          kontobezeichnung?: string | null
          kontoklasse?: string | null
          kontonummer?: string
          kostenartt_typ?: string | null
          kpi_kategorie?: string | null
        }
        Relationships: []
      }
      kpi_schwellenwerte: {
        Row: {
          abteilung: string
          alarm_aktiv: boolean | null
          created_at: string | null
          id: string
          kpi_typ: string
          schwellenwert_max: number | null
          schwellenwert_min: number | null
        }
        Insert: {
          abteilung: string
          alarm_aktiv?: boolean | null
          created_at?: string | null
          id?: string
          kpi_typ: string
          schwellenwert_max?: number | null
          schwellenwert_min?: number | null
        }
        Update: {
          abteilung?: string
          alarm_aktiv?: boolean | null
          created_at?: string | null
          id?: string
          kpi_typ?: string
          schwellenwert_max?: number | null
          schwellenwert_min?: number | null
        }
        Relationships: []
      }
      menue_weinbegleitung: {
        Row: {
          anlass: string | null
          created_at: string | null
          datum: string
          gaenge: Json
          id: string
          titel: string
          updated_at: string | null
        }
        Insert: {
          anlass?: string | null
          created_at?: string | null
          datum?: string
          gaenge?: Json
          id?: string
          titel: string
          updated_at?: string | null
        }
        Update: {
          anlass?: string | null
          created_at?: string | null
          datum?: string
          gaenge?: Json
          id?: string
          titel?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mitarbeiter: {
        Row: {
          abteilung: string
          aktiv: boolean | null
          aktualisiert_am: string | null
          berufsbezeichnung: string | null
          brutto_monatsgehalt: number | null
          eintrittsdatum: string | null
          email: string | null
          erstellt_am: string | null
          id: string
          nachname: string
          position: string | null
          rolle: string | null
          stundenlohn: number | null
          telefon: string | null
          vorname: string
          wochenstunden: number | null
        }
        Insert: {
          abteilung: string
          aktiv?: boolean | null
          aktualisiert_am?: string | null
          berufsbezeichnung?: string | null
          brutto_monatsgehalt?: number | null
          eintrittsdatum?: string | null
          email?: string | null
          erstellt_am?: string | null
          id?: string
          nachname: string
          position?: string | null
          rolle?: string | null
          stundenlohn?: number | null
          telefon?: string | null
          vorname: string
          wochenstunden?: number | null
        }
        Update: {
          abteilung?: string
          aktiv?: boolean | null
          aktualisiert_am?: string | null
          berufsbezeichnung?: string | null
          brutto_monatsgehalt?: number | null
          eintrittsdatum?: string | null
          email?: string | null
          erstellt_am?: string | null
          id?: string
          nachname?: string
          position?: string | null
          rolle?: string | null
          stundenlohn?: number | null
          telefon?: string | null
          vorname?: string
          wochenstunden?: number | null
        }
        Relationships: []
      }
      nps_monat: {
        Row: {
          bewertungen_anzahl: number | null
          created_at: string | null
          detraktoren_pct: number | null
          id: string
          jahr: number
          monat: number
          nps_score: number
          promotoren_pct: number | null
          quelle: string | null
          updated_at: string | null
        }
        Insert: {
          bewertungen_anzahl?: number | null
          created_at?: string | null
          detraktoren_pct?: number | null
          id?: string
          jahr: number
          monat: number
          nps_score: number
          promotoren_pct?: number | null
          quelle?: string | null
          updated_at?: string | null
        }
        Update: {
          bewertungen_anzahl?: number | null
          created_at?: string | null
          detraktoren_pct?: number | null
          id?: string
          jahr?: number
          monat?: number
          nps_score?: number
          promotoren_pct?: number | null
          quelle?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      protel_belegung: {
        Row: {
          anzerw: number | null
          anzkin: number | null
          datum: string
          extras_brutto: number | null
          extras_netto: number | null
          fb_brutto: number | null
          fb_netto: number | null
          gaeste_gesamt: number | null
          gesamt_brutto: number | null
          id: number
          imhaus: boolean | null
          kategorie: number | null
          kategorie_name: string | null
          logis_brutto: number | null
          logis_netto: number | null
          market: number | null
          preistyp: number | null
          preistypgr: number | null
          rmarrive: boolean | null
          rmdepart: boolean | null
          source: number | null
          synced_at: string | null
          zimmer_name: string | null
          zimmernr: string
        }
        Insert: {
          anzerw?: number | null
          anzkin?: number | null
          datum: string
          extras_brutto?: number | null
          extras_netto?: number | null
          fb_brutto?: number | null
          fb_netto?: number | null
          gaeste_gesamt?: number | null
          gesamt_brutto?: number | null
          id?: number
          imhaus?: boolean | null
          kategorie?: number | null
          kategorie_name?: string | null
          logis_brutto?: number | null
          logis_netto?: number | null
          market?: number | null
          preistyp?: number | null
          preistypgr?: number | null
          rmarrive?: boolean | null
          rmdepart?: boolean | null
          source?: number | null
          synced_at?: string | null
          zimmer_name?: string | null
          zimmernr: string
        }
        Update: {
          anzerw?: number | null
          anzkin?: number | null
          datum?: string
          extras_brutto?: number | null
          extras_netto?: number | null
          fb_brutto?: number | null
          fb_netto?: number | null
          gaeste_gesamt?: number | null
          gesamt_brutto?: number | null
          id?: number
          imhaus?: boolean | null
          kategorie?: number | null
          kategorie_name?: string | null
          logis_brutto?: number | null
          logis_netto?: number | null
          market?: number | null
          preistyp?: number | null
          preistypgr?: number | null
          rmarrive?: boolean | null
          rmdepart?: boolean | null
          source?: number | null
          synced_at?: string | null
          zimmer_name?: string | null
          zimmernr?: string
        }
        Relationships: []
      }
      protel_buchungen: {
        Row: {
          abzeit: string | null
          anzeit: string | null
          anzerw: number | null
          anzkin: number | null
          buchnr: number
          buchstatus: number | null
          buchungsvorlauf: number | null
          channelnr: number | null
          come: number | null
          cxl: number | null
          datumbis: string | null
          datumvon: string | null
          del: number | null
          discount: number | null
          discval: number | null
          firmennr: number | null
          gender: string | null
          grundpreis: number | null
          gruppennr: number | null
          hear: number | null
          id: number
          kategorie: number | null
          kdnr: number | null
          market: number | null
          naechte: number | null
          preis: number | null
          preistyp: number | null
          preistypgr: number | null
          promotion: string | null
          reisenr: number | null
          resdatum: string | null
          resstatus: number | null
          sharenr: number | null
          source: number | null
          sourcenr: number | null
          stornodat: string | null
          stornotxt: string | null
          synced_at: string | null
          voucher: string | null
          zimmer_name: string | null
          zimmernr: string | null
        }
        Insert: {
          abzeit?: string | null
          anzeit?: string | null
          anzerw?: number | null
          anzkin?: number | null
          buchnr: number
          buchstatus?: number | null
          buchungsvorlauf?: number | null
          channelnr?: number | null
          come?: number | null
          cxl?: number | null
          datumbis?: string | null
          datumvon?: string | null
          del?: number | null
          discount?: number | null
          discval?: number | null
          firmennr?: number | null
          gender?: string | null
          grundpreis?: number | null
          gruppennr?: number | null
          hear?: number | null
          id?: number
          kategorie?: number | null
          kdnr?: number | null
          market?: number | null
          naechte?: number | null
          preis?: number | null
          preistyp?: number | null
          preistypgr?: number | null
          promotion?: string | null
          reisenr?: number | null
          resdatum?: string | null
          resstatus?: number | null
          sharenr?: number | null
          source?: number | null
          sourcenr?: number | null
          stornodat?: string | null
          stornotxt?: string | null
          synced_at?: string | null
          voucher?: string | null
          zimmer_name?: string | null
          zimmernr?: string | null
        }
        Update: {
          abzeit?: string | null
          anzeit?: string | null
          anzerw?: number | null
          anzkin?: number | null
          buchnr?: number
          buchstatus?: number | null
          buchungsvorlauf?: number | null
          channelnr?: number | null
          come?: number | null
          cxl?: number | null
          datumbis?: string | null
          datumvon?: string | null
          del?: number | null
          discount?: number | null
          discval?: number | null
          firmennr?: number | null
          gender?: string | null
          grundpreis?: number | null
          gruppennr?: number | null
          hear?: number | null
          id?: number
          kategorie?: number | null
          kdnr?: number | null
          market?: number | null
          naechte?: number | null
          preis?: number | null
          preistyp?: number | null
          preistypgr?: number | null
          promotion?: string | null
          reisenr?: number | null
          resdatum?: string | null
          resstatus?: number | null
          sharenr?: number | null
          source?: number | null
          sourcenr?: number | null
          stornodat?: string | null
          stornotxt?: string | null
          synced_at?: string | null
          voucher?: string | null
          zimmer_name?: string | null
          zimmernr?: string | null
        }
        Relationships: []
      }
      protel_config: {
        Row: {
          active: boolean | null
          created_at: string | null
          database: string
          db_password_enc: string
          db_user: string
          hotel_name: string
          id: string
          instance: string | null
          port: number | null
          server: string
          setup_complete: boolean | null
          table_names: Json | null
          total_rooms: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          database: string
          db_password_enc: string
          db_user: string
          hotel_name?: string
          id?: string
          instance?: string | null
          port?: number | null
          server: string
          setup_complete?: boolean | null
          table_names?: Json | null
          total_rooms?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          database?: string
          db_password_enc?: string
          db_user?: string
          hotel_name?: string
          id?: string
          instance?: string | null
          port?: number | null
          server?: string
          setup_complete?: boolean | null
          table_names?: Json | null
          total_rooms?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      protel_gaeste: {
        Row: {
          anrede: string | null
          aufenth: number | null
          aufenth_vj: number | null
          bemerkung: string | null
          beruf: string | null
          deleted: number | null
          discount: number | null
          email: string | null
          erfasst: string | null
          extras: number | null
          extras_vj: number | null
          fb: number | null
          fb_vj: number | null
          firststay: string | null
          funktel: string | null
          gebdat: string | null
          gender: number | null
          id: number
          kdnr: number
          land: string | null
          letzterauf: string | null
          letzterpr: number | null
          letzteszi: string | null
          logis: number | null
          logis_vj: number | null
          mailing: number | null
          marketing: number | null
          naechte: number | null
          naechte_vj: number | null
          name1: string | null
          name2: string | null
          nat: number | null
          noshows: number | null
          noshows_vj: number | null
          ort: string | null
          plz: string | null
          sprache: number | null
          stornos: number | null
          stornos_vj: number | null
          strasse: string | null
          synced_at: string | null
          telefonnr: string | null
          titel: string | null
          typ: number | null
          vip: number | null
          vorname: string | null
        }
        Insert: {
          anrede?: string | null
          aufenth?: number | null
          aufenth_vj?: number | null
          bemerkung?: string | null
          beruf?: string | null
          deleted?: number | null
          discount?: number | null
          email?: string | null
          erfasst?: string | null
          extras?: number | null
          extras_vj?: number | null
          fb?: number | null
          fb_vj?: number | null
          firststay?: string | null
          funktel?: string | null
          gebdat?: string | null
          gender?: number | null
          id?: number
          kdnr: number
          land?: string | null
          letzterauf?: string | null
          letzterpr?: number | null
          letzteszi?: string | null
          logis?: number | null
          logis_vj?: number | null
          mailing?: number | null
          marketing?: number | null
          naechte?: number | null
          naechte_vj?: number | null
          name1?: string | null
          name2?: string | null
          nat?: number | null
          noshows?: number | null
          noshows_vj?: number | null
          ort?: string | null
          plz?: string | null
          sprache?: number | null
          stornos?: number | null
          stornos_vj?: number | null
          strasse?: string | null
          synced_at?: string | null
          telefonnr?: string | null
          titel?: string | null
          typ?: number | null
          vip?: number | null
          vorname?: string | null
        }
        Update: {
          anrede?: string | null
          aufenth?: number | null
          aufenth_vj?: number | null
          bemerkung?: string | null
          beruf?: string | null
          deleted?: number | null
          discount?: number | null
          email?: string | null
          erfasst?: string | null
          extras?: number | null
          extras_vj?: number | null
          fb?: number | null
          fb_vj?: number | null
          firststay?: string | null
          funktel?: string | null
          gebdat?: string | null
          gender?: number | null
          id?: number
          kdnr?: number
          land?: string | null
          letzterauf?: string | null
          letzterpr?: number | null
          letzteszi?: string | null
          logis?: number | null
          logis_vj?: number | null
          mailing?: number | null
          marketing?: number | null
          naechte?: number | null
          naechte_vj?: number | null
          name1?: string | null
          name2?: string | null
          nat?: number | null
          noshows?: number | null
          noshows_vj?: number | null
          ort?: string | null
          plz?: string | null
          sprache?: number | null
          stornos?: number | null
          stornos_vj?: number | null
          strasse?: string | null
          synced_at?: string | null
          telefonnr?: string | null
          titel?: string | null
          typ?: number | null
          vip?: number | null
          vorname?: string | null
        }
        Relationships: []
      }
      protel_gasttyp_mapping: {
        Row: {
          gasttyp: string
          gasttyp_kurz: string
          rategrp_ref: number
        }
        Insert: {
          gasttyp: string
          gasttyp_kurz: string
          rategrp_ref: number
        }
        Update: {
          gasttyp?: string
          gasttyp_kurz?: string
          rategrp_ref?: number
        }
        Relationships: []
      }
      protel_kdnr_gasttyp: {
        Row: {
          gasttyp: string | null
          kdnr: number
          rategrp: number | null
          rategrp_text: string | null
          synced_at: string | null
        }
        Insert: {
          gasttyp?: string | null
          kdnr: number
          rategrp?: number | null
          rategrp_text?: string | null
          synced_at?: string | null
        }
        Update: {
          gasttyp?: string | null
          kdnr?: number
          rategrp?: number | null
          rategrp_text?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      protel_kpi_tag: {
        Row: {
          abreisen: number | null
          adr: number | null
          ankuenfte: number | null
          auslastung_pct: number | null
          avg_buchungsvorlauf: number | null
          datum: string
          durchlaufend_netto: number | null
          extras_netto: number | null
          fb_netto: number | null
          gaeste_gesamt: number | null
          id: number
          kosmetik_netto: number | null
          logis_netto: number | null
          revpar: number | null
          stornos_tag: number | null
          synced_at: string | null
          therapie_netto: number | null
          total_brutto: number | null
          total_netto: number | null
          zahlungen_netto: number | null
          zimmer_belegt: number | null
          zimmer_verfuegbar: number | null
        }
        Insert: {
          abreisen?: number | null
          adr?: number | null
          ankuenfte?: number | null
          auslastung_pct?: number | null
          avg_buchungsvorlauf?: number | null
          datum: string
          durchlaufend_netto?: number | null
          extras_netto?: number | null
          fb_netto?: number | null
          gaeste_gesamt?: number | null
          id?: number
          kosmetik_netto?: number | null
          logis_netto?: number | null
          revpar?: number | null
          stornos_tag?: number | null
          synced_at?: string | null
          therapie_netto?: number | null
          total_brutto?: number | null
          total_netto?: number | null
          zahlungen_netto?: number | null
          zimmer_belegt?: number | null
          zimmer_verfuegbar?: number | null
        }
        Update: {
          abreisen?: number | null
          adr?: number | null
          ankuenfte?: number | null
          auslastung_pct?: number | null
          avg_buchungsvorlauf?: number | null
          datum?: string
          durchlaufend_netto?: number | null
          extras_netto?: number | null
          fb_netto?: number | null
          gaeste_gesamt?: number | null
          id?: number
          kosmetik_netto?: number | null
          logis_netto?: number | null
          revpar?: number | null
          stornos_tag?: number | null
          synced_at?: string | null
          therapie_netto?: number | null
          total_brutto?: number | null
          total_netto?: number | null
          zahlungen_netto?: number | null
          zimmer_belegt?: number | null
          zimmer_verfuegbar?: number | null
        }
        Relationships: []
      }
      protel_lost_business: {
        Row: {
          anzerw: number | null
          anzkin: number | null
          bemerkung: string | null
          datum: string | null
          datumbis: string | null
          datumvon: string | null
          grund: string | null
          id: number
          kategorie: number | null
          kdnr: number | null
          lostnr: number
          market: number | null
          naechte: number | null
          preis: number | null
          source: number | null
          synced_at: string | null
        }
        Insert: {
          anzerw?: number | null
          anzkin?: number | null
          bemerkung?: string | null
          datum?: string | null
          datumbis?: string | null
          datumvon?: string | null
          grund?: string | null
          id?: number
          kategorie?: number | null
          kdnr?: number | null
          lostnr: number
          market?: number | null
          naechte?: number | null
          preis?: number | null
          source?: number | null
          synced_at?: string | null
        }
        Update: {
          anzerw?: number | null
          anzkin?: number | null
          bemerkung?: string | null
          datum?: string | null
          datumbis?: string | null
          datumvon?: string | null
          grund?: string | null
          id?: number
          kategorie?: number | null
          kdnr?: number | null
          lostnr?: number
          market?: number | null
          naechte?: number | null
          preis?: number | null
          source?: number | null
          synced_at?: string | null
        }
        Relationships: []
      }
      protel_maerkte: {
        Row: {
          bezeichnung: string | null
          id: number
          kuerzel: string | null
          marketnr: number
          synced_at: string | null
        }
        Insert: {
          bezeichnung?: string | null
          id?: number
          kuerzel?: string | null
          marketnr: number
          synced_at?: string | null
        }
        Update: {
          bezeichnung?: string | null
          id?: number
          kuerzel?: string | null
          marketnr?: number
          synced_at?: string | null
        }
        Relationships: []
      }
      protel_ptypgrp: {
        Row: {
          gruppe: string | null
          id: number
          longtext: string | null
          ptgnr: number
          rategrp: number | null
          synced_at: string | null
        }
        Insert: {
          gruppe?: string | null
          id?: number
          longtext?: string | null
          ptgnr: number
          rategrp?: number | null
          synced_at?: string | null
        }
        Update: {
          gruppe?: string | null
          id?: number
          longtext?: string | null
          ptgnr?: number
          rategrp?: number | null
          synced_at?: string | null
        }
        Relationships: []
      }
      protel_quellen: {
        Row: {
          bezeichnung: string | null
          id: number
          kuerzel: string | null
          sourcenr: number
          synced_at: string | null
        }
        Insert: {
          bezeichnung?: string | null
          id?: number
          kuerzel?: string | null
          sourcenr: number
          synced_at?: string | null
        }
        Update: {
          bezeichnung?: string | null
          id?: number
          kuerzel?: string | null
          sourcenr?: number
          synced_at?: string | null
        }
        Relationships: []
      }
      protel_rategrp: {
        Row: {
          id: number
          ref: number
          short: string | null
          synced_at: string | null
          text: string | null
        }
        Insert: {
          id?: number
          ref: number
          short?: string | null
          synced_at?: string | null
          text?: string | null
        }
        Update: {
          id?: number
          ref?: number
          short?: string | null
          synced_at?: string | null
          text?: string | null
        }
        Relationships: []
      }
      protel_sync_log: {
        Row: {
          beendet_um: string | null
          bis_datum: string | null
          datensaetze: number | null
          dauer_ms: number | null
          fehler: string | null
          gestartet_um: string | null
          id: number
          status: string
          sync_typ: string
          von_datum: string | null
        }
        Insert: {
          beendet_um?: string | null
          bis_datum?: string | null
          datensaetze?: number | null
          dauer_ms?: number | null
          fehler?: string | null
          gestartet_um?: string | null
          id?: number
          status: string
          sync_typ: string
          von_datum?: string | null
        }
        Update: {
          beendet_um?: string | null
          bis_datum?: string | null
          datensaetze?: number | null
          dauer_ms?: number | null
          fehler?: string | null
          gestartet_um?: string | null
          id?: number
          status?: string
          sync_typ?: string
          von_datum?: string | null
        }
        Relationships: []
      }
      protel_tagesbericht: {
        Row: {
          brutto: number | null
          datum: string
          gbudget: number | null
          hauptgrp: number | null
          hauptgrp_name: string | null
          id: number
          kto: string
          kto_bezeichnung: string | null
          nbudget: number | null
          netto: number | null
          synced_at: string | null
        }
        Insert: {
          brutto?: number | null
          datum: string
          gbudget?: number | null
          hauptgrp?: number | null
          hauptgrp_name?: string | null
          id?: number
          kto: string
          kto_bezeichnung?: string | null
          nbudget?: number | null
          netto?: number | null
          synced_at?: string | null
        }
        Update: {
          brutto?: number | null
          datum?: string
          gbudget?: number | null
          hauptgrp?: number | null
          hauptgrp_name?: string | null
          id?: number
          kto?: string
          kto_bezeichnung?: string | null
          nbudget?: number | null
          netto?: number | null
          synced_at?: string | null
        }
        Relationships: []
      }
      protel_traces: {
        Row: {
          abt: number | null
          auto: number | null
          bqleistacc: number | null
          datum: string | null
          del: number | null
          dokument: string | null
          erledigungsdatum: string | null
          erledigungsuser: string | null
          erledigungszeit: string | null
          event: string | null
          history: string | null
          id: number
          kdnr: number | null
          leistacc: number | null
          refnr: number | null
          rueckmelddatum: string | null
          rueckmelduser: string | null
          synced_at: string | null
          text1: string | null
          text2: string | null
          textlokal: string | null
          uhrzeit: string | null
        }
        Insert: {
          abt?: number | null
          auto?: number | null
          bqleistacc?: number | null
          datum?: string | null
          del?: number | null
          dokument?: string | null
          erledigungsdatum?: string | null
          erledigungsuser?: string | null
          erledigungszeit?: string | null
          event?: string | null
          history?: string | null
          id?: number
          kdnr?: number | null
          leistacc?: number | null
          refnr?: number | null
          rueckmelddatum?: string | null
          rueckmelduser?: string | null
          synced_at?: string | null
          text1?: string | null
          text2?: string | null
          textlokal?: string | null
          uhrzeit?: string | null
        }
        Update: {
          abt?: number | null
          auto?: number | null
          bqleistacc?: number | null
          datum?: string | null
          del?: number | null
          dokument?: string | null
          erledigungsdatum?: string | null
          erledigungsuser?: string | null
          erledigungszeit?: string | null
          event?: string | null
          history?: string | null
          id?: number
          kdnr?: number | null
          leistacc?: number | null
          refnr?: number | null
          rueckmelddatum?: string | null
          rueckmelduser?: string | null
          synced_at?: string | null
          text1?: string | null
          text2?: string | null
          textlokal?: string | null
          uhrzeit?: string | null
        }
        Relationships: []
      }
      protel_umsatzkonten: {
        Row: {
          bezeichnung: string | null
          hauptgrp: number | null
          hauptgrp_name: string | null
          id: number
          kto: string | null
          ktonr: number
          synced_at: string | null
        }
        Insert: {
          bezeichnung?: string | null
          hauptgrp?: number | null
          hauptgrp_name?: string | null
          id?: number
          kto?: string | null
          ktonr: number
          synced_at?: string | null
        }
        Update: {
          bezeichnung?: string | null
          hauptgrp?: number | null
          hauptgrp_name?: string | null
          id?: number
          kto?: string | null
          ktonr?: number
          synced_at?: string | null
        }
        Relationships: []
      }
      protel_zimmer: {
        Row: {
          beschr: string | null
          besonder: string | null
          floor: number | null
          id: number
          ist_verkaufszimmer: boolean | null
          kategorie: number | null
          stdbel: number | null
          synced_at: string | null
          ziname: string
          zinr: number
        }
        Insert: {
          beschr?: string | null
          besonder?: string | null
          floor?: number | null
          id?: number
          ist_verkaufszimmer?: boolean | null
          kategorie?: number | null
          stdbel?: number | null
          synced_at?: string | null
          ziname: string
          zinr: number
        }
        Update: {
          beschr?: string | null
          besonder?: string | null
          floor?: number | null
          id?: number
          ist_verkaufszimmer?: boolean | null
          kategorie?: number | null
          stdbel?: number | null
          synced_at?: string | null
          ziname?: string
          zinr?: number
        }
        Relationships: []
      }
      revenue_config: {
        Row: {
          beschreibung: string | null
          key: string
          typ: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          beschreibung?: string | null
          key: string
          typ?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          beschreibung?: string | null
          key?: string
          typ?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      revenue_saison: {
        Row: {
          betrieb_luecke_tage: number | null
          created_at: string | null
          gewicht_pct: number
          id: number
          monat_name: string
          monat_nr: number
          occ_2024: number | null
          occ_2025: number | null
          saison: string
          strategie: string | null
        }
        Insert: {
          betrieb_luecke_tage?: number | null
          created_at?: string | null
          gewicht_pct: number
          id?: number
          monat_name: string
          monat_nr: number
          occ_2024?: number | null
          occ_2025?: number | null
          saison: string
          strategie?: string | null
        }
        Update: {
          betrieb_luecke_tage?: number | null
          created_at?: string | null
          gewicht_pct?: number
          id?: number
          monat_name?: string
          monat_nr?: number
          occ_2024?: number | null
          occ_2025?: number | null
          saison?: string
          strategie?: string | null
        }
        Relationships: []
      }
      revenue_supplement: {
        Row: {
          belegung: string
          id: number
          saison: string
          supplement: number
          tier: number
          updated_at: string | null
          zimmer_typ: string
        }
        Insert: {
          belegung: string
          id?: number
          saison: string
          supplement?: number
          tier: number
          updated_at?: string | null
          zimmer_typ: string
        }
        Update: {
          belegung?: string
          id?: number
          saison?: string
          supplement?: number
          tier?: number
          updated_at?: string | null
          zimmer_typ?: string
        }
        Relationships: []
      }
      revenue_ziele: {
        Row: {
          betrag: number
          created_at: string | null
          id: number
          jahr: number
          kategorie: string
          monat_nr: number | null
          notiz: string | null
          quelle: string | null
        }
        Insert: {
          betrag: number
          created_at?: string | null
          id?: number
          jahr: number
          kategorie: string
          monat_nr?: number | null
          notiz?: string | null
          quelle?: string | null
        }
        Update: {
          betrag?: number
          created_at?: string | null
          id?: number
          jahr?: number
          kategorie?: string
          monat_nr?: number | null
          notiz?: string | null
          quelle?: string | null
        }
        Relationships: []
      }
      room_type_mapping: {
        Row: {
          beschreibung: string | null
          betten: number
          created_at: string | null
          fluegel: string
          for_distribution: boolean
          hat_ac: boolean
          hat_balkon: boolean
          ist_grand: boolean
          tier: number
          zimmer_nr: string
          zimmer_typ: string
        }
        Insert: {
          beschreibung?: string | null
          betten?: number
          created_at?: string | null
          fluegel: string
          for_distribution?: boolean
          hat_ac?: boolean
          hat_balkon?: boolean
          ist_grand?: boolean
          tier?: number
          zimmer_nr: string
          zimmer_typ: string
        }
        Update: {
          beschreibung?: string | null
          betten?: number
          created_at?: string | null
          fluegel?: string
          for_distribution?: boolean
          hat_ac?: boolean
          hat_balkon?: boolean
          ist_grand?: boolean
          tier?: number
          zimmer_nr?: string
          zimmer_typ?: string
        }
        Relationships: []
      }
      salden_monat: {
        Row: {
          created_at: string | null
          id: string
          jahr: number
          kontonummer: string
          monat: number
          saldo_haben_monat: number | null
          saldo_monat: number | null
          saldo_soll_monat: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          jahr: number
          kontonummer: string
          monat: number
          saldo_haben_monat?: number | null
          saldo_monat?: number | null
          saldo_soll_monat?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          jahr?: number
          kontonummer?: string
          monat?: number
          saldo_haben_monat?: number | null
          saldo_monat?: number | null
          saldo_soll_monat?: number | null
        }
        Relationships: []
      }
      schichten: {
        Row: {
          aktualisiert_am: string | null
          bemerkung: string | null
          datum: string
          diensttyp: string | null
          endzeit: string
          erstellt_am: string | null
          id: string
          mitarbeiter_id: string
          pause_minuten: number | null
          schichttyp: string | null
          startzeit: string
        }
        Insert: {
          aktualisiert_am?: string | null
          bemerkung?: string | null
          datum: string
          diensttyp?: string | null
          endzeit: string
          erstellt_am?: string | null
          id?: string
          mitarbeiter_id: string
          pause_minuten?: number | null
          schichttyp?: string | null
          startzeit: string
        }
        Update: {
          aktualisiert_am?: string | null
          bemerkung?: string | null
          datum?: string
          diensttyp?: string | null
          endzeit?: string
          erstellt_am?: string | null
          id?: string
          mitarbeiter_id?: string
          pause_minuten?: number | null
          schichttyp?: string | null
          startzeit?: string
        }
        Relationships: [
          {
            foreignKeyName: "schichten_mitarbeiter_id_fkey"
            columns: ["mitarbeiter_id"]
            isOneToOne: false
            referencedRelation: "mitarbeiter"
            referencedColumns: ["id"]
          },
        ]
      }
      service_daily_reports: {
        Row: {
          complaint_rate_pct: number | null
          complaints: number | null
          covers_breakfast: number | null
          covers_dinner: number | null
          covers_lunch: number | null
          covers_per_employee: number | null
          covers_total: number | null
          created_at: string | null
          extra_beverage_revenue: number | null
          extra_food_revenue: number | null
          extra_revenue_per_cover: number | null
          guests_absent: number | null
          id: string
          report_date: string
          staff_count: number | null
          total_hours: number | null
        }
        Insert: {
          complaint_rate_pct?: number | null
          complaints?: number | null
          covers_breakfast?: number | null
          covers_dinner?: number | null
          covers_lunch?: number | null
          covers_per_employee?: number | null
          covers_total?: number | null
          created_at?: string | null
          extra_beverage_revenue?: number | null
          extra_food_revenue?: number | null
          extra_revenue_per_cover?: number | null
          guests_absent?: number | null
          id?: string
          report_date: string
          staff_count?: number | null
          total_hours?: number | null
        }
        Update: {
          complaint_rate_pct?: number | null
          complaints?: number | null
          covers_breakfast?: number | null
          covers_dinner?: number | null
          covers_lunch?: number | null
          covers_per_employee?: number | null
          covers_total?: number | null
          created_at?: string | null
          extra_beverage_revenue?: number | null
          extra_food_revenue?: number | null
          extra_revenue_per_cover?: number | null
          guests_absent?: number | null
          id?: string
          report_date?: string
          staff_count?: number | null
          total_hours?: number | null
        }
        Relationships: []
      }
      shift_suggestion_rejections: {
        Row: {
          abteilungsleiter_id: string
          begruendung: string
          created_at: string
          datum: string
          employee_id: string
          id: string
          ueberstunden_aktuell: number
        }
        Insert: {
          abteilungsleiter_id: string
          begruendung: string
          created_at?: string
          datum: string
          employee_id: string
          id?: string
          ueberstunden_aktuell?: number
        }
        Update: {
          abteilungsleiter_id?: string
          begruendung?: string
          created_at?: string
          datum?: string
          employee_id?: string
          id?: string
          ueberstunden_aktuell?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_suggestion_rejections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_daily_reports: {
        Row: {
          available_slots: number | null
          avg_revenue_per_treatment: number | null
          booked_slots: number | null
          complaints: number | null
          created_at: string | null
          id: string
          product_attachment_rate: number | null
          report_date: string
          revenue_ayurveda: number | null
          revenue_classic: number | null
          revenue_cosmetic: number | null
          revenue_products: number | null
          revenue_total: number | null
          revenue_yoga: number | null
          therapists_count: number | null
          total_hours: number | null
          treatment_rooms_total: number | null
          treatments_ayurveda: number | null
          treatments_classic: number | null
          treatments_cosmetic: number | null
          treatments_other: number | null
          treatments_per_therapist: number | null
          treatments_total: number | null
          treatments_yoga: number | null
          utilization_pct: number | null
        }
        Insert: {
          available_slots?: number | null
          avg_revenue_per_treatment?: number | null
          booked_slots?: number | null
          complaints?: number | null
          created_at?: string | null
          id?: string
          product_attachment_rate?: number | null
          report_date: string
          revenue_ayurveda?: number | null
          revenue_classic?: number | null
          revenue_cosmetic?: number | null
          revenue_products?: number | null
          revenue_total?: number | null
          revenue_yoga?: number | null
          therapists_count?: number | null
          total_hours?: number | null
          treatment_rooms_total?: number | null
          treatments_ayurveda?: number | null
          treatments_classic?: number | null
          treatments_cosmetic?: number | null
          treatments_other?: number | null
          treatments_per_therapist?: number | null
          treatments_total?: number | null
          treatments_yoga?: number | null
          utilization_pct?: number | null
        }
        Update: {
          available_slots?: number | null
          avg_revenue_per_treatment?: number | null
          booked_slots?: number | null
          complaints?: number | null
          created_at?: string | null
          id?: string
          product_attachment_rate?: number | null
          report_date?: string
          revenue_ayurveda?: number | null
          revenue_classic?: number | null
          revenue_cosmetic?: number | null
          revenue_products?: number | null
          revenue_total?: number | null
          revenue_yoga?: number | null
          therapists_count?: number | null
          total_hours?: number | null
          treatment_rooms_total?: number | null
          treatments_ayurveda?: number | null
          treatments_classic?: number | null
          treatments_cosmetic?: number | null
          treatments_other?: number | null
          treatments_per_therapist?: number | null
          treatments_total?: number | null
          treatments_yoga?: number | null
          utilization_pct?: number | null
        }
        Relationships: []
      }
      tac_article_categories: {
        Row: {
          farbe: string | null
          generic_articleid: number
          kategorie: string | null
        }
        Insert: {
          farbe?: string | null
          generic_articleid: number
          kategorie?: string | null
        }
        Update: {
          farbe?: string | null
          generic_articleid?: number
          kategorie?: string | null
        }
        Relationships: []
      }
      tac_articles: {
        Row: {
          articleid: number
          concurrent_treatments: number | null
          deleted: boolean | null
          gender: number | null
          generic_articleid: number | null
          id: number
          label: string | null
          name: string | null
          ressortgroupid: number | null
          synced_at: string | null
        }
        Insert: {
          articleid: number
          concurrent_treatments?: number | null
          deleted?: boolean | null
          gender?: number | null
          generic_articleid?: number | null
          id?: number
          label?: string | null
          name?: string | null
          ressortgroupid?: number | null
          synced_at?: string | null
        }
        Update: {
          articleid?: number
          concurrent_treatments?: number | null
          deleted?: boolean | null
          gender?: number | null
          generic_articleid?: number | null
          id?: number
          label?: string | null
          name?: string | null
          ressortgroupid?: number | null
          synced_at?: string | null
        }
        Relationships: []
      }
      tac_artikel: {
        Row: {
          deleted: boolean | null
          description: string | null
          id: number
          kassa_article_typeid: number | null
          kassa_articleid: number
          kontono: string | null
          name: string | null
          price: number | null
          ressortgroupid: number | null
          ressortid: number | null
          sales_relevant: boolean | null
          synced_at: string | null
          type: number | null
        }
        Insert: {
          deleted?: boolean | null
          description?: string | null
          id?: number
          kassa_article_typeid?: number | null
          kassa_articleid: number
          kontono?: string | null
          name?: string | null
          price?: number | null
          ressortgroupid?: number | null
          ressortid?: number | null
          sales_relevant?: boolean | null
          synced_at?: string | null
          type?: number | null
        }
        Update: {
          deleted?: boolean | null
          description?: string | null
          id?: number
          kassa_article_typeid?: number | null
          kassa_articleid?: number
          kontono?: string | null
          name?: string | null
          price?: number | null
          ressortgroupid?: number | null
          ressortid?: number | null
          sales_relevant?: boolean | null
          synced_at?: string | null
          type?: number | null
        }
        Relationships: []
      }
      tac_behandlung_kategorie_override: {
        Row: {
          behandlung_name: string
          farbe: string | null
          generic_articleid: number | null
          kategorie: string | null
        }
        Insert: {
          behandlung_name: string
          farbe?: string | null
          generic_articleid?: number | null
          kategorie?: string | null
        }
        Update: {
          behandlung_name?: string
          farbe?: string | null
          generic_articleid?: number | null
          kategorie?: string | null
        }
        Relationships: []
      }
      tac_behandlungen: {
        Row: {
          amount: number | null
          behandlung_name: string | null
          bookingid: number
          businessdate: string | null
          cancel_date: string | null
          cancel_reason: string | null
          channel: number | null
          consumed: number | null
          course_customerid: number | null
          customerid: number | null
          duration: number | null
          id: number
          kassa_articleid: number | null
          logonid: number | null
          orig_price: number | null
          package_customerid: number | null
          package_itemid: number | null
          paymethodid: number | null
          price: number | null
          reservationid: number | null
          startdate: string | null
          storno: boolean | null
          synced_at: string | null
        }
        Insert: {
          amount?: number | null
          behandlung_name?: string | null
          bookingid: number
          businessdate?: string | null
          cancel_date?: string | null
          cancel_reason?: string | null
          channel?: number | null
          consumed?: number | null
          course_customerid?: number | null
          customerid?: number | null
          duration?: number | null
          id?: number
          kassa_articleid?: number | null
          logonid?: number | null
          orig_price?: number | null
          package_customerid?: number | null
          package_itemid?: number | null
          paymethodid?: number | null
          price?: number | null
          reservationid?: number | null
          startdate?: string | null
          storno?: boolean | null
          synced_at?: string | null
        }
        Update: {
          amount?: number | null
          behandlung_name?: string | null
          bookingid?: number
          businessdate?: string | null
          cancel_date?: string | null
          cancel_reason?: string | null
          channel?: number | null
          consumed?: number | null
          course_customerid?: number | null
          customerid?: number | null
          duration?: number | null
          id?: number
          kassa_articleid?: number | null
          logonid?: number | null
          orig_price?: number | null
          package_customerid?: number | null
          package_itemid?: number | null
          paymethodid?: number | null
          price?: number | null
          reservationid?: number | null
          startdate?: string | null
          storno?: boolean | null
          synced_at?: string | null
        }
        Relationships: []
      }
      tac_kpi_tag: {
        Row: {
          behandlungen_gesamt: number | null
          behandlungen_storno: number | null
          datum: string
          id: number
          kunden_gesamt: number | null
          synced_at: string | null
          top1_anzahl: number | null
          top1_name: string | null
          top1_umsatz: number | null
          top2_anzahl: number | null
          top2_name: string | null
          top2_umsatz: number | null
          top3_anzahl: number | null
          top3_name: string | null
          top3_umsatz: number | null
          umsatz_gesamt: number | null
        }
        Insert: {
          behandlungen_gesamt?: number | null
          behandlungen_storno?: number | null
          datum: string
          id?: number
          kunden_gesamt?: number | null
          synced_at?: string | null
          top1_anzahl?: number | null
          top1_name?: string | null
          top1_umsatz?: number | null
          top2_anzahl?: number | null
          top2_name?: string | null
          top2_umsatz?: number | null
          top3_anzahl?: number | null
          top3_name?: string | null
          top3_umsatz?: number | null
          umsatz_gesamt?: number | null
        }
        Update: {
          behandlungen_gesamt?: number | null
          behandlungen_storno?: number | null
          datum?: string
          id?: number
          kunden_gesamt?: number | null
          synced_at?: string | null
          top1_anzahl?: number | null
          top1_name?: string | null
          top1_umsatz?: number | null
          top2_anzahl?: number | null
          top2_name?: string | null
          top2_umsatz?: number | null
          top3_anzahl?: number | null
          top3_name?: string | null
          top3_umsatz?: number | null
          umsatz_gesamt?: number | null
        }
        Relationships: []
      }
      tac_kunden: {
        Row: {
          birthday: string | null
          city: string | null
          country: string | null
          creation_date: string | null
          customerid: number
          deleted: boolean | null
          email: string | null
          first_name: string | null
          gender: number | null
          id: number
          last_name: string | null
          mobilphone: string | null
          phone: string | null
          street: string | null
          synced_at: string | null
          zip_code: string | null
        }
        Insert: {
          birthday?: string | null
          city?: string | null
          country?: string | null
          creation_date?: string | null
          customerid: number
          deleted?: boolean | null
          email?: string | null
          first_name?: string | null
          gender?: number | null
          id?: number
          last_name?: string | null
          mobilphone?: string | null
          phone?: string | null
          street?: string | null
          synced_at?: string | null
          zip_code?: string | null
        }
        Update: {
          birthday?: string | null
          city?: string | null
          country?: string | null
          creation_date?: string | null
          customerid?: number
          deleted?: boolean | null
          email?: string | null
          first_name?: string | null
          gender?: number | null
          id?: number
          last_name?: string | null
          mobilphone?: string | null
          phone?: string | null
          street?: string | null
          synced_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      tac_protel_mapping: {
        Row: {
          created_at: string | null
          gebdat: string | null
          konfidenz: number | null
          match_typ: string | null
          nachname: string | null
          protel_kdnr: number
          synced_at: string | null
          tac_customerid: number
        }
        Insert: {
          created_at?: string | null
          gebdat?: string | null
          konfidenz?: number | null
          match_typ?: string | null
          nachname?: string | null
          protel_kdnr: number
          synced_at?: string | null
          tac_customerid: number
        }
        Update: {
          created_at?: string | null
          gebdat?: string | null
          konfidenz?: number | null
          match_typ?: string | null
          nachname?: string | null
          protel_kdnr?: number
          synced_at?: string | null
          tac_customerid?: number
        }
        Relationships: []
      }
      tac_reservations_articles: {
        Row: {
          articleid: number
          dauer_minuten: number | null
          from_timeslot: number | null
          id: number
          reservationid: number
          synced_at: string | null
          until_timeslot: number | null
        }
        Insert: {
          articleid: number
          dauer_minuten?: number | null
          from_timeslot?: number | null
          id?: number
          reservationid: number
          synced_at?: string | null
          until_timeslot?: number | null
        }
        Update: {
          articleid?: number
          dauer_minuten?: number | null
          from_timeslot?: number | null
          id?: number
          reservationid?: number
          synced_at?: string | null
          until_timeslot?: number | null
        }
        Relationships: []
      }
      tac_reservierungen: {
        Row: {
          cancel_date: string | null
          cancel_reason: string | null
          customerid: number | null
          dauer_minuten: number | null
          end_timeslot: number | null
          id: number
          logonid: number | null
          reservation_templateid: number | null
          reservationdate: string | null
          reservationid: number
          start_timeslot: number | null
          storno: boolean | null
          synced_at: string | null
        }
        Insert: {
          cancel_date?: string | null
          cancel_reason?: string | null
          customerid?: number | null
          dauer_minuten?: number | null
          end_timeslot?: number | null
          id?: number
          logonid?: number | null
          reservation_templateid?: number | null
          reservationdate?: string | null
          reservationid: number
          start_timeslot?: number | null
          storno?: boolean | null
          synced_at?: string | null
        }
        Update: {
          cancel_date?: string | null
          cancel_reason?: string | null
          customerid?: number | null
          dauer_minuten?: number | null
          end_timeslot?: number | null
          id?: number
          logonid?: number | null
          reservation_templateid?: number | null
          reservationdate?: string | null
          reservationid?: number
          start_timeslot?: number | null
          storno?: boolean | null
          synced_at?: string | null
        }
        Relationships: []
      }
      tac_sync_log: {
        Row: {
          beendet_um: string | null
          bis_datum: string | null
          datensaetze: number | null
          dauer_ms: number | null
          fehler: string | null
          gestartet_um: string | null
          id: number
          status: string
          sync_typ: string
          von_datum: string | null
        }
        Insert: {
          beendet_um?: string | null
          bis_datum?: string | null
          datensaetze?: number | null
          dauer_ms?: number | null
          fehler?: string | null
          gestartet_um?: string | null
          id?: number
          status: string
          sync_typ: string
          von_datum?: string | null
        }
        Update: {
          beendet_um?: string | null
          bis_datum?: string | null
          datensaetze?: number | null
          dauer_ms?: number | null
          fehler?: string | null
          gestartet_um?: string | null
          id?: number
          status?: string
          sync_typ?: string
          von_datum?: string | null
        }
        Relationships: []
      }
      tac_therapeuten: {
        Row: {
          disabled: number | null
          email: string | null
          employee_id: string | null
          employee_type: number | null
          first_name: string | null
          full_name: string | null
          id: number
          last_name: string | null
          logonid: number
          ressortgroupid: number | null
          synced_at: string | null
          userlogin: string | null
          validfrom: string | null
          validuntil: string | null
        }
        Insert: {
          disabled?: number | null
          email?: string | null
          employee_id?: string | null
          employee_type?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: number
          last_name?: string | null
          logonid: number
          ressortgroupid?: number | null
          synced_at?: string | null
          userlogin?: string | null
          validfrom?: string | null
          validuntil?: string | null
        }
        Update: {
          disabled?: number | null
          email?: string | null
          employee_id?: string | null
          employee_type?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: number
          last_name?: string | null
          logonid?: number
          ressortgroupid?: number | null
          synced_at?: string | null
          userlogin?: string | null
          validfrom?: string | null
          validuntil?: string | null
        }
        Relationships: []
      }
      technik_bestellungen: {
        Row: {
          amount: number
          approver_id: string | null
          approver_role: string | null
          created_at: string
          currency: string
          department: string
          id: string
          invoice_url: string | null
          month_start: string
          notes: string | null
          ordered_at: string | null
          received: boolean
          received_at: string | null
          requester_id: string
          requester_name: string | null
          status: string
          updated_at: string
          vendor: string
          vendor_url: string | null
        }
        Insert: {
          amount: number
          approver_id?: string | null
          approver_role?: string | null
          created_at?: string
          currency?: string
          department: string
          id?: string
          invoice_url?: string | null
          month_start: string
          notes?: string | null
          ordered_at?: string | null
          received?: boolean
          received_at?: string | null
          requester_id: string
          requester_name?: string | null
          status?: string
          updated_at?: string
          vendor: string
          vendor_url?: string | null
        }
        Update: {
          amount?: number
          approver_id?: string | null
          approver_role?: string | null
          created_at?: string
          currency?: string
          department?: string
          id?: string
          invoice_url?: string | null
          month_start?: string
          notes?: string | null
          ordered_at?: string | null
          received?: boolean
          received_at?: string | null
          requester_id?: string
          requester_name?: string | null
          status?: string
          updated_at?: string
          vendor?: string
          vendor_url?: string | null
        }
        Relationships: []
      }
      technik_daily_reports: {
        Row: {
          avg_response_hours: number | null
          completion_rate_pct: number | null
          created_at: string | null
          external_service_cost_week: number | null
          id: string
          material_cost_week: number | null
          preventive_tasks: number | null
          report_date: string
          staff_count: number | null
          tickets_completed: number | null
          tickets_kitchen: number | null
          tickets_low: number | null
          tickets_new: number | null
          tickets_normal: number | null
          tickets_open: number | null
          tickets_outdoor: number | null
          tickets_per_employee: number | null
          tickets_public: number | null
          tickets_rooms: number | null
          tickets_spa: number | null
          tickets_urgent: number | null
          total_hours: number | null
        }
        Insert: {
          avg_response_hours?: number | null
          completion_rate_pct?: number | null
          created_at?: string | null
          external_service_cost_week?: number | null
          id?: string
          material_cost_week?: number | null
          preventive_tasks?: number | null
          report_date: string
          staff_count?: number | null
          tickets_completed?: number | null
          tickets_kitchen?: number | null
          tickets_low?: number | null
          tickets_new?: number | null
          tickets_normal?: number | null
          tickets_open?: number | null
          tickets_outdoor?: number | null
          tickets_per_employee?: number | null
          tickets_public?: number | null
          tickets_rooms?: number | null
          tickets_spa?: number | null
          tickets_urgent?: number | null
          total_hours?: number | null
        }
        Update: {
          avg_response_hours?: number | null
          completion_rate_pct?: number | null
          created_at?: string | null
          external_service_cost_week?: number | null
          id?: string
          material_cost_week?: number | null
          preventive_tasks?: number | null
          report_date?: string
          staff_count?: number | null
          tickets_completed?: number | null
          tickets_kitchen?: number | null
          tickets_low?: number | null
          tickets_new?: number | null
          tickets_normal?: number | null
          tickets_open?: number | null
          tickets_outdoor?: number | null
          tickets_per_employee?: number | null
          tickets_public?: number | null
          tickets_rooms?: number | null
          tickets_spa?: number | null
          tickets_urgent?: number | null
          total_hours?: number | null
        }
        Relationships: []
      }
      ueberstunden: {
        Row: {
          aktualisiert_am: string | null
          ausbezahlt: boolean | null
          erstellt_am: string | null
          id: string
          ist_stunden: number | null
          jahr: number
          mitarbeiter_id: string
          monat: number
          soll_stunden: number | null
          ueberstunden: number | null
        }
        Insert: {
          aktualisiert_am?: string | null
          ausbezahlt?: boolean | null
          erstellt_am?: string | null
          id?: string
          ist_stunden?: number | null
          jahr: number
          mitarbeiter_id: string
          monat: number
          soll_stunden?: number | null
          ueberstunden?: number | null
        }
        Update: {
          aktualisiert_am?: string | null
          ausbezahlt?: boolean | null
          erstellt_am?: string | null
          id?: string
          ist_stunden?: number | null
          jahr?: number
          mitarbeiter_id?: string
          monat?: number
          soll_stunden?: number | null
          ueberstunden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ueberstunden_mitarbeiter_id_fkey"
            columns: ["mitarbeiter_id"]
            isOneToOne: false
            referencedRelation: "mitarbeiter"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          accounts_created: number | null
          balances_created: number | null
          error_message: string | null
          file_size: number | null
          filename: string
          id: string
          records_processed: number | null
          status: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          accounts_created?: number | null
          balances_created?: number | null
          error_message?: string | null
          file_size?: number | null
          filename: string
          id?: string
          records_processed?: number | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          accounts_created?: number | null
          balances_created?: number | null
          error_message?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          records_processed?: number | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          abteilung: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          abteilung?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          abteilung?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      wein_lager: {
        Row: {
          anzahl_flaschen: number | null
          einkaufspreis: number | null
          erfasst_am: string | null
          fach: number | null
          id: string
          jahrgang: string | null
          lagerort: string
          name: string
          rebsorte: string | null
          region: string | null
          reihe: number | null
          weingut: string | null
        }
        Insert: {
          anzahl_flaschen?: number | null
          einkaufspreis?: number | null
          erfasst_am?: string | null
          fach?: number | null
          id?: string
          jahrgang?: string | null
          lagerort: string
          name: string
          rebsorte?: string | null
          region?: string | null
          reihe?: number | null
          weingut?: string | null
        }
        Update: {
          anzahl_flaschen?: number | null
          einkaufspreis?: number | null
          erfasst_am?: string | null
          fach?: number | null
          id?: string
          jahrgang?: string | null
          lagerort?: string
          name?: string
          rebsorte?: string | null
          region?: string | null
          reihe?: number | null
          weingut?: string | null
        }
        Relationships: []
      }
      zeiterfassung: {
        Row: {
          aktualisiert_am: string | null
          bemerkung: string | null
          datum: string
          diensttyp: string | null
          endzeit: string | null
          erstellt_am: string | null
          id: string
          ist_stunden: number | null
          mitarbeiter_id: string
          pause_minuten: number | null
          startzeit: string | null
        }
        Insert: {
          aktualisiert_am?: string | null
          bemerkung?: string | null
          datum: string
          diensttyp?: string | null
          endzeit?: string | null
          erstellt_am?: string | null
          id?: string
          ist_stunden?: number | null
          mitarbeiter_id: string
          pause_minuten?: number | null
          startzeit?: string | null
        }
        Update: {
          aktualisiert_am?: string | null
          bemerkung?: string | null
          datum?: string
          diensttyp?: string | null
          endzeit?: string | null
          erstellt_am?: string | null
          id?: string
          ist_stunden?: number | null
          mitarbeiter_id?: string
          pause_minuten?: number | null
          startzeit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zeiterfassung_mitarbeiter_id_fkey"
            columns: ["mitarbeiter_id"]
            isOneToOne: false
            referencedRelation: "mitarbeiter"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_anstehende_termine: {
        Row: {
          auto_id: string | null
          bereich_anlage: string | null
          faellig_am: string | null
          reminder_sent: boolean | null
          status: string | null
          tage_bis_faellig: number | null
          typ: string | null
          zustaendig: string | null
        }
        Relationships: []
      }
      admin_erinnerungen_faellig: {
        Row: {
          auto_id: string | null
          bereich_anlage: string | null
          faellig_am: string | null
          source_id: string | null
          source_table: string | null
          typ: string | null
        }
        Relationships: []
      }
      v_abteilung_umsatz_monat: {
        Row: {
          extras_netto: number | null
          fb_gesamt_netto: number | null
          jahr: number | null
          kosmetik_netto: number | null
          kueche_netto: number | null
          monat: number | null
          rezeption_netto: number | null
          service_netto: number | null
          spa_gesamt_netto: number | null
          tage_mit_daten: number | null
          therapie_netto: number | null
          total_brutto: number | null
          total_netto: number | null
        }
        Relationships: []
      }
      v_abteilung_umsatz_tag: {
        Row: {
          datum: string | null
          extras_netto: number | null
          fb_gesamt_netto: number | null
          kosmetik_netto: number | null
          kueche_netto: number | null
          rezeption_netto: number | null
          service_netto: number | null
          spa_gesamt_netto: number | null
          therapie_netto: number | null
          total_netto: number | null
        }
        Relationships: []
      }
      v_behandlungen_therapeut: {
        Row: {
          behandlung: string | null
          bookingid: number | null
          customerid: number | null
          datum: string | null
          duration: number | null
          jahr: number | null
          monat: number | null
          price: number | null
          raum_id: number | null
          raum_name: string | null
          reservationid: number | null
          storno: boolean | null
          therapeut_gender: number | null
          therapeut_id: number | null
          therapeut_name: string | null
        }
        Relationships: []
      }
      v_behandlungen_top: {
        Row: {
          anzahl: number | null
          behandlung: string | null
          farbe: string | null
          generic_articleid: number | null
          jahr: number | null
          kategorie: string | null
          preis_avg: number | null
          umsatz_gesamt: number | null
        }
        Relationships: []
      }
      v_buchungsvorlauf: {
        Row: {
          anzahl_buchungen: number | null
          avg_adr: number | null
          avg_naechte: number | null
          avg_vorlauf_tage: number | null
          channelnr: number | null
          jahr: number | null
          max_vorlauf_tage: number | null
          min_vorlauf_tage: number | null
          monat_nr: number | null
          saison: string | null
          sourcenr: number | null
          sum_umsatz: number | null
        }
        Relationships: []
      }
      v_employee_rejection_count: {
        Row: {
          ablehnungen_gesamt: number | null
          ablehnungen_letzter_monat: number | null
          employee_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_suggestion_rejections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gaeste_alter: {
        Row: {
          altersgruppe: string | null
          altersgruppe_order: number | null
          anzahl_gaeste: number | null
          avg_naechte: number | null
          jahr: number | null
        }
        Relationships: []
      }
      v_gaeste_gasttyp: {
        Row: {
          anzahl_aufenthalte: number | null
          email: string | null
          gasttyp: string | null
          gebdat: string | null
          kdnr: number | null
          land: string | null
          letzterauf: string | null
          letztes_paket: string | null
          nachname: string | null
          paket_kurz: string | null
          rategrp_name: string | null
          vorname: string | null
        }
        Relationships: []
      }
      v_gaeste_laender: {
        Row: {
          anzahl_buchungen: number | null
          anzahl_gaeste: number | null
          avg_naechte: number | null
          jahr: number | null
          land: string | null
          logis_gesamt: number | null
          naechte_gesamt: number | null
        }
        Relationships: []
      }
      v_gaeste_reiseart: {
        Row: {
          anzahl_buchungen: number | null
          anzahl_gaeste: number | null
          avg_naechte: number | null
          jahr: number | null
          reiseart: string | null
          reiseart_order: number | null
        }
        Relationships: []
      }
      v_gaeste_top: {
        Row: {
          aktivitaet: string | null
          aufenth: number | null
          aufenth_berechnet: number | null
          filter_jahr: number | null
          firststay: string | null
          kdnr: number | null
          land: string | null
          letzterauf: string | null
          logis_cj: number | null
          logis_gesamt: number | null
          logis_vj: number | null
          nachname: string | null
          naechte: number | null
          umsatz_gesamt: number | null
          vorname: string | null
        }
        Relationships: []
      }
      v_gaeste_top_mit_jahr: {
        Row: {
          aktivitaet: string | null
          aufenthalte_jahr: number | null
          erster_aufenthalt_jahr: string | null
          jahr: number | null
          kdnr: number | null
          land: string | null
          letzter_aufenthalt_jahr: string | null
          logis_jahr: number | null
          nachname: string | null
          naechte_jahr: number | null
          umsatz_jahr: number | null
          vorname: string | null
        }
        Relationships: []
      }
      v_infusionen_analyse: {
        Row: {
          anzahl: number | null
          behandlung: string | null
          dauer_avg_min: number | null
          eur_pro_stunde: number | null
          jahr: number | null
          kategorie: string | null
          preis_avg: number | null
        }
        Relationships: []
      }
      v_kampagne_geburtstag: {
        Row: {
          anzahl_aufenthalte: number | null
          email: string | null
          gasttyp: string | null
          gebdat: string | null
          geburtstag_monat: number | null
          geburtstag_tag: number | null
          kdnr: number | null
          land: string | null
          letzterauf: string | null
          nachname: string | null
          paket_kurz: string | null
          vorname: string | null
        }
        Relationships: []
      }
      v_kampagne_rueckkehrer: {
        Row: {
          anzahl_aufenthalte: number | null
          email: string | null
          gasttyp: string | null
          gebdat: string | null
          kdnr: number | null
          land: string | null
          letzterauf: string | null
          mailing: number | null
          marketing: number | null
          nachname: string | null
          paket_kurz: string | null
          vorname: string | null
        }
        Relationships: []
      }
      v_kampagne_saisonal: {
        Row: {
          anzahl_aufenthalte: number | null
          email: string | null
          gasttyp: string | null
          kdnr: number | null
          land: string | null
          letzterauf: string | null
          nachname: string | null
          paket_kurz: string | null
          stammmonat: number | null
          vorname: string | null
        }
        Relationships: []
      }
      v_kampagne_stammgaeste: {
        Row: {
          anzahl_aufenthalte: number | null
          email: string | null
          gasttyp: string | null
          gebdat: string | null
          kdnr: number | null
          land: string | null
          letzterauf: string | null
          logis_gesamt: number | null
          nachname: string | null
          paket_kurz: string | null
          tage_seit_letztem_aufenthalt: number | null
          vorname: string | null
        }
        Relationships: []
      }
      v_kampagne_upgrade: {
        Row: {
          anzahl_aufenthalte: number | null
          anzahl_behandlungen: number | null
          ayurveda_behandlungen: number | null
          email: string | null
          gasttyp: string | null
          kdnr: number | null
          land: string | null
          letzterauf: string | null
          nachname: string | null
          spa_umsatz: number | null
          vorname: string | null
        }
        Relationships: []
      }
      v_kanal_performance: {
        Row: {
          anzahl_buchungen: number | null
          avg_adr: number | null
          avg_discount_pct: number | null
          avg_grundpreis: number | null
          avg_vorlauf_tage: number | null
          bezeichnung: string | null
          jahr: number | null
          sourcenr: number | null
          storno_rate_pct: number | null
          stornos: number | null
          sum_naechte: number | null
          sum_umsatz: number | null
        }
        Relationships: []
      }
      v_revenue_monat: {
        Row: {
          extras_bereinigt: number | null
          fnb_bereinigt: number | null
          gesamt_bereinigt: number | null
          gesamt_brutto: number | null
          gewicht_pct: number | null
          jahr: number | null
          logis_bereinigt: number | null
          logis_brutto: number | null
          monat_name: string | null
          monat_nr: number | null
          saison: string | null
          therapie_bereinigt: number | null
        }
        Relationships: []
      }
      v_revpar_by_roomtype: {
        Row: {
          arr_netto: number | null
          datum: string | null
          fluegel: string | null
          for_distribution: boolean | null
          gaeste_naechte: number | null
          hat_ac: boolean | null
          ist_grand: boolean | null
          logis_umsatz_brutto: number | null
          logis_umsatz_netto: number | null
          revpar_netto: number | null
          saison: string | null
          strategie: string | null
          tier: number | null
          zimmer_belegt: number | null
          zimmer_typ: string | null
        }
        Relationships: []
      }
      v_saison_kpi: {
        Row: {
          abreisen: number | null
          ankuenfte: number | null
          arr: number | null
          arr_delta_pct: number | null
          auslastung_pct: number | null
          belegte_zimmer: number | null
          datum: string | null
          jahr: number | null
          logis_umsatz: number | null
          monat_name: string | null
          monat_nr: number | null
          revpar: number | null
          revpar_delta_pct: number | null
          saison: string | null
          strategie: string | null
          vj_arr: number | null
          vj_auslastung_pct: number | null
          vj_logis_umsatz: number | null
          vj_revpar: number | null
        }
        Relationships: []
      }
      v_spa_behandlungen_ranking: {
        Row: {
          anzahl: number | null
          avg_dauer_minuten: number | null
          avg_preis: number | null
          behandlung_name: string | null
          jahr: number | null
          sum_umsatz: number | null
          umsatz_pro_stunde: number | null
        }
        Relationships: []
      }
      v_spa_therapeut_behandlungen: {
        Row: {
          anzahl: number | null
          articleid: number | null
          avg_preis: number | null
          behandlung_name: string | null
          jahr: number | null
          sum_umsatz: number | null
          therapeut_label: string | null
          total_minuten: number | null
        }
        Relationships: []
      }
      v_spa_therapeuten_performance: {
        Row: {
          anzahl_behandlungen: number | null
          articleid: number | null
          avg_dauer_minuten: number | null
          avg_preis_pro_behandlung: number | null
          gender: number | null
          jahr: number | null
          sum_umsatz: number | null
          therapeut_label: string | null
          therapeut_name: string | null
          total_minuten: number | null
          total_stunden: number | null
          umsatz_pro_stunde: number | null
        }
        Relationships: []
      }
      v_therapeuten_echt: {
        Row: {
          anzahl_behandlungen: number | null
          arbeitstage: number | null
          gender: number | null
          jahr: number | null
          preis_avg: number | null
          therapeut_id: number | null
          therapeut_name: string | null
          umsatz_gesamt: number | null
          unique_gaeste: number | null
        }
        Relationships: []
      }
      v_therapeuten_performance: {
        Row: {
          anzahl_behandlungen: number | null
          avg_preis_pro_beh: number | null
          full_name: string | null
          jahr: number | null
          logonid: number | null
          sum_umsatz: number | null
          total_stunden: number | null
          umsatz_pro_stunde: number | null
          userlogin: string | null
        }
        Relationships: []
      }
      v_treatment_profil: {
        Row: {
          anzahl_behandlungen: number | null
          anzahl_jahre: number | null
          anzahl_verschiedene_beh: number | null
          avg_preis_pro_beh: number | null
          customerid: number | null
          erste_behandlung: string | null
          letzte_behandlung: string | null
          lieblingsartikel_id: number | null
          lieblingstherapeut_id: number | null
          nachname: string | null
          sum_umsatz: number | null
          vorname: string | null
        }
        Relationships: []
      }
      v_wiederkehrrate: {
        Row: {
          aktiv_letztes_jahr: number | null
          anzahl_gaeste: number | null
          avg_aufenthalte: number | null
          avg_naechte: number | null
          segment: string | null
          segment_order: number | null
        }
        Relationships: []
      }
      v_wiederkehrrate_jahr: {
        Row: {
          anzahl_gaeste: number | null
          avg_aufenthalte: number | null
          jahr: number | null
          segment: string | null
          segment_order: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      call_reminder_edge_function: { Args: never; Returns: undefined }
      call_send_reminder: { Args: never; Returns: undefined }
      check_and_log_reminders: {
        Args: never
        Returns: {
          auto_id: string
          bereich_anlage: string
          faellig_am: string
          typ: string
          zustaendig: string
        }[]
      }
      get_current_employee_id: { Args: never; Returns: string }
      get_user_role: { Args: { check_user_id: string }; Returns: string }
      get_view_def: { Args: { vname: string }; Returns: string }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
      spa_stichtag_vergleich: {
        Args: { p_end: string; p_start: string }
        Returns: {
          behandlungen: number
          therapeuten: number
          total_minuten: number
          umsatz: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
