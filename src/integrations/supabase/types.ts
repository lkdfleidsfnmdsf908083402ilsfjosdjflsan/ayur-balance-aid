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
          austrittsdatum: string | null
          created_at: string
          eintrittsdatum: string
          email: string | null
          id: string
          nachname: string
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
          austrittsdatum?: string | null
          created_at?: string
          eintrittsdatum?: string
          email?: string | null
          id?: string
          nachname: string
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
          austrittsdatum?: string | null
          created_at?: string
          eintrittsdatum?: string
          email?: string | null
          id?: string
          nachname?: string
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
          aktualisiert_am: string | null
          bereich: string
          beschreibung: string | null
          erstellt_am: string | null
          id: string
          klasse: string
          kontonummer: string
          kostentyp: string
          kpi_kategorie: string | null
        }
        Insert: {
          aktualisiert_am?: string | null
          bereich: string
          beschreibung?: string | null
          erstellt_am?: string | null
          id?: string
          klasse: string
          kontonummer: string
          kostentyp: string
          kpi_kategorie?: string | null
        }
        Update: {
          aktualisiert_am?: string | null
          bereich?: string
          beschreibung?: string | null
          erstellt_am?: string | null
          id?: string
          klasse?: string
          kontonummer?: string
          kostentyp?: string
          kpi_kategorie?: string | null
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
      salden_monat: {
        Row: {
          aktualisiert_am: string | null
          erstellt_am: string | null
          haben_betrag: number | null
          id: string
          jahr: number
          konto_id: string
          monat: number
          soll_betrag: number | null
        }
        Insert: {
          aktualisiert_am?: string | null
          erstellt_am?: string | null
          haben_betrag?: number | null
          id?: string
          jahr: number
          konto_id: string
          monat: number
          soll_betrag?: number | null
        }
        Update: {
          aktualisiert_am?: string | null
          erstellt_am?: string | null
          haben_betrag?: number | null
          id?: string
          jahr?: number
          konto_id?: string
          monat?: number
          soll_betrag?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salden_monat_konto_id_fkey"
            columns: ["konto_id"]
            isOneToOne: false
            referencedRelation: "konten"
            referencedColumns: ["id"]
          },
        ]
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
          eintrittsdatum: string | null
          email: string
          id: string
          ist_aktiv: boolean | null
          letzter_login: string | null
          nachname: string | null
          sprache: string | null
          telefon: string | null
          updated_at: string | null
          vorname: string | null
        }
        Insert: {
          abteilung?: string | null
          created_at?: string | null
          eintrittsdatum?: string | null
          email: string
          id: string
          ist_aktiv?: boolean | null
          letzter_login?: string | null
          nachname?: string | null
          sprache?: string | null
          telefon?: string | null
          updated_at?: string | null
          vorname?: string | null
        }
        Update: {
          abteilung?: string | null
          created_at?: string | null
          eintrittsdatum?: string | null
          email?: string
          id?: string
          ist_aktiv?: boolean | null
          letzter_login?: string | null
          nachname?: string | null
          sprache?: string | null
          telefon?: string | null
          updated_at?: string | null
          vorname?: string | null
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
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
