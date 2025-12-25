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
      abteilung_kpi_monat: {
        Row: {
          abschreibung: number
          abteilung: string
          betriebsaufwand: number
          created_at: string
          db1: number
          db1_diff: number | null
          db1_diff_prozent: number | null
          db1_vorjahr: number | null
          db2: number
          db2_diff: number | null
          db2_diff_prozent: number | null
          db2_vorjahr: number | null
          energie: number
          id: string
          jahr: number
          marketing: number
          monat: number
          personal: number
          umsatz: number
          umsatz_diff: number | null
          umsatz_diff_prozent: number | null
          umsatz_vorjahr: number | null
          updated_at: string
          wareneinsatz: number
          zins: number
        }
        Insert: {
          abschreibung?: number
          abteilung: string
          betriebsaufwand?: number
          created_at?: string
          db1?: number
          db1_diff?: number | null
          db1_diff_prozent?: number | null
          db1_vorjahr?: number | null
          db2?: number
          db2_diff?: number | null
          db2_diff_prozent?: number | null
          db2_vorjahr?: number | null
          energie?: number
          id?: string
          jahr: number
          marketing?: number
          monat: number
          personal?: number
          umsatz?: number
          umsatz_diff?: number | null
          umsatz_diff_prozent?: number | null
          umsatz_vorjahr?: number | null
          updated_at?: string
          wareneinsatz?: number
          zins?: number
        }
        Update: {
          abschreibung?: number
          abteilung?: string
          betriebsaufwand?: number
          created_at?: string
          db1?: number
          db1_diff?: number | null
          db1_diff_prozent?: number | null
          db1_vorjahr?: number | null
          db2?: number
          db2_diff?: number | null
          db2_diff_prozent?: number | null
          db2_vorjahr?: number | null
          energie?: number
          id?: string
          jahr?: number
          marketing?: number
          monat?: number
          personal?: number
          umsatz?: number
          umsatz_diff?: number | null
          umsatz_diff_prozent?: number | null
          umsatz_vorjahr?: number | null
          updated_at?: string
          wareneinsatz?: number
          zins?: number
        }
        Relationships: []
      }
      abteilungsleiter: {
        Row: {
          abteilung: string
          aktiv: boolean
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          abteilung: string
          aktiv?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          abteilung?: string
          aktiv?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_daily_reports: {
        Row: {
          admin_hours_total: number
          admin_staff_on_duty: number
          applications_received: number
          attendance_rate: number | null
          created_at: string
          daily_expenses: number
          daily_revenue: number
          deliveries_received: number
          dpo_days: number | null
          dso_days: number | null
          id: string
          it_availability_pct: number | null
          it_resolution_rate_pct: number | null
          it_tickets_open: number
          it_tickets_resolved: number
          monthly_turnover_rate_pct: number | null
          new_hires: number
          open_invoices_count: number
          open_invoices_value: number
          open_positions: number
          open_positions_rate_pct: number | null
          open_receivables: number
          orders_placed: number
          paid_invoices_count: number
          payment_compliance_pct: number | null
          planned_employees: number
          reminders_sent: number
          report_date: string
          sick_days: number
          sick_rate_pct: number | null
          supplier_complaint_rate_pct: number | null
          supplier_complaints: number
          system_downtime_min: number
          terminations: number
          total_employees: number
          turnover_rate: number | null
          updated_at: string
        }
        Insert: {
          admin_hours_total?: number
          admin_staff_on_duty?: number
          applications_received?: number
          attendance_rate?: number | null
          created_at?: string
          daily_expenses?: number
          daily_revenue?: number
          deliveries_received?: number
          dpo_days?: number | null
          dso_days?: number | null
          id?: string
          it_availability_pct?: number | null
          it_resolution_rate_pct?: number | null
          it_tickets_open?: number
          it_tickets_resolved?: number
          monthly_turnover_rate_pct?: number | null
          new_hires?: number
          open_invoices_count?: number
          open_invoices_value?: number
          open_positions?: number
          open_positions_rate_pct?: number | null
          open_receivables?: number
          orders_placed?: number
          paid_invoices_count?: number
          payment_compliance_pct?: number | null
          planned_employees?: number
          reminders_sent?: number
          report_date: string
          sick_days?: number
          sick_rate_pct?: number | null
          supplier_complaint_rate_pct?: number | null
          supplier_complaints?: number
          system_downtime_min?: number
          terminations?: number
          total_employees?: number
          turnover_rate?: number | null
          updated_at?: string
        }
        Update: {
          admin_hours_total?: number
          admin_staff_on_duty?: number
          applications_received?: number
          attendance_rate?: number | null
          created_at?: string
          daily_expenses?: number
          daily_revenue?: number
          deliveries_received?: number
          dpo_days?: number | null
          dso_days?: number | null
          id?: string
          it_availability_pct?: number | null
          it_resolution_rate_pct?: number | null
          it_tickets_open?: number
          it_tickets_resolved?: number
          monthly_turnover_rate_pct?: number | null
          new_hires?: number
          open_invoices_count?: number
          open_invoices_value?: number
          open_positions?: number
          open_positions_rate_pct?: number | null
          open_receivables?: number
          orders_placed?: number
          paid_invoices_count?: number
          payment_compliance_pct?: number | null
          planned_employees?: number
          reminders_sent?: number
          report_date?: string
          sick_days?: number
          sick_rate_pct?: number | null
          supplier_complaint_rate_pct?: number | null
          supplier_complaints?: number
          system_downtime_min?: number
          terminations?: number
          total_employees?: number
          turnover_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      budget_planung: {
        Row: {
          abteilung: string
          created_at: string
          db1_budget: number
          db2_budget: number
          energie_budget: number
          id: string
          jahr: number
          marketing_budget: number
          monat: number
          personal_budget: number
          umsatz_budget: number
          updated_at: string
          wareneinsatz_budget: number
        }
        Insert: {
          abteilung: string
          created_at?: string
          db1_budget?: number
          db2_budget?: number
          energie_budget?: number
          id?: string
          jahr: number
          marketing_budget?: number
          monat: number
          personal_budget?: number
          umsatz_budget?: number
          updated_at?: string
          wareneinsatz_budget?: number
        }
        Update: {
          abteilung?: string
          created_at?: string
          db1_budget?: number
          db2_budget?: number
          energie_budget?: number
          id?: string
          jahr?: number
          marketing_budget?: number
          monat?: number
          personal_budget?: number
          umsatz_budget?: number
          updated_at?: string
          wareneinsatz_budget?: number
        }
        Relationships: []
      }
      employee_shifts: {
        Row: {
          abwesenheit: Database["public"]["Enums"]["absence_reason"]
          abwesenheit_notiz: string | null
          created_at: string
          datum: string
          employee_id: string
          id: string
          ist_beginn: string | null
          ist_ende: string | null
          ist_stunden: number | null
          nachmittag_beginn: string | null
          nachmittag_ende: string | null
          pause_minuten: number | null
          schicht_beginn: string | null
          schicht_ende: string | null
          soll_stunden: number
          ueberstunden: number | null
          updated_at: string
          vormittag_beginn: string | null
          vormittag_ende: string | null
        }
        Insert: {
          abwesenheit?: Database["public"]["Enums"]["absence_reason"]
          abwesenheit_notiz?: string | null
          created_at?: string
          datum: string
          employee_id: string
          id?: string
          ist_beginn?: string | null
          ist_ende?: string | null
          ist_stunden?: number | null
          nachmittag_beginn?: string | null
          nachmittag_ende?: string | null
          pause_minuten?: number | null
          schicht_beginn?: string | null
          schicht_ende?: string | null
          soll_stunden?: number
          ueberstunden?: number | null
          updated_at?: string
          vormittag_beginn?: string | null
          vormittag_ende?: string | null
        }
        Update: {
          abwesenheit?: Database["public"]["Enums"]["absence_reason"]
          abwesenheit_notiz?: string | null
          created_at?: string
          datum?: string
          employee_id?: string
          id?: string
          ist_beginn?: string | null
          ist_ende?: string | null
          ist_stunden?: number | null
          nachmittag_beginn?: string | null
          nachmittag_ende?: string | null
          pause_minuten?: number | null
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
          anstellungsart: Database["public"]["Enums"]["employment_type"]
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
          anstellungsart?: Database["public"]["Enums"]["employment_type"]
          austrittsdatum?: string | null
          created_at?: string
          eintrittsdatum: string
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
          anstellungsart?: Database["public"]["Enums"]["employment_type"]
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
      frontoffice_daily_reports: {
        Row: {
          arrivals_total: number
          attendance_rate: number | null
          avg_checkin_time_sec: number
          avg_checkout_time_sec: number
          avg_fo_rating: number | null
          avg_queue_time_sec: number | null
          created_at: string
          departures_total: number
          fcr_pct: number | null
          fo_complaint_rate_pct: number | null
          fo_complaints: number
          fo_hours_total: number
          fo_ratings_count: number
          fo_ratings_sum: number
          fo_staff_on_duty: number
          guests_per_fo_employee: number | null
          id: string
          report_date: string
          requests_per_hour: number | null
          requests_resolved_first_contact: number
          requests_total: number
          turnover_rate: number | null
          updated_at: string
          upsell_attempts: number
          upsell_conversion_pct: number | null
          upsell_rev_per_arrival: number | null
          upsell_revenue: number
          upsell_successes: number
        }
        Insert: {
          arrivals_total?: number
          attendance_rate?: number | null
          avg_checkin_time_sec?: number
          avg_checkout_time_sec?: number
          avg_fo_rating?: number | null
          avg_queue_time_sec?: number | null
          created_at?: string
          departures_total?: number
          fcr_pct?: number | null
          fo_complaint_rate_pct?: number | null
          fo_complaints?: number
          fo_hours_total?: number
          fo_ratings_count?: number
          fo_ratings_sum?: number
          fo_staff_on_duty?: number
          guests_per_fo_employee?: number | null
          id?: string
          report_date: string
          requests_per_hour?: number | null
          requests_resolved_first_contact?: number
          requests_total?: number
          turnover_rate?: number | null
          updated_at?: string
          upsell_attempts?: number
          upsell_conversion_pct?: number | null
          upsell_rev_per_arrival?: number | null
          upsell_revenue?: number
          upsell_successes?: number
        }
        Update: {
          arrivals_total?: number
          attendance_rate?: number | null
          avg_checkin_time_sec?: number
          avg_checkout_time_sec?: number
          avg_fo_rating?: number | null
          avg_queue_time_sec?: number | null
          created_at?: string
          departures_total?: number
          fcr_pct?: number | null
          fo_complaint_rate_pct?: number | null
          fo_complaints?: number
          fo_hours_total?: number
          fo_ratings_count?: number
          fo_ratings_sum?: number
          fo_staff_on_duty?: number
          guests_per_fo_employee?: number | null
          id?: string
          report_date?: string
          requests_per_hour?: number | null
          requests_resolved_first_contact?: number
          requests_total?: number
          turnover_rate?: number | null
          updated_at?: string
          upsell_attempts?: number
          upsell_conversion_pct?: number | null
          upsell_rev_per_arrival?: number | null
          upsell_revenue?: number
          upsell_successes?: number
        }
        Relationships: []
      }
      hk_daily_reports: {
        Row: {
          attendance_rate: number | null
          avg_minutes_per_room: number | null
          cleaned_rooms: number
          complaint_rate: number | null
          complaints_cleanliness: number
          created_at: string
          hk_employees_on_duty: number
          hk_hours_total: number | null
          id: string
          inspected_rooms: number
          inspection_pass_rate: number | null
          occupied_rooms: number
          passed_rooms: number
          report_date: string
          rooms_in_sale: number
          rooms_per_attendant: number | null
          shift_minutes: number | null
          total_cleaning_minutes: number | null
          turnover_rate: number | null
          updated_at: string
        }
        Insert: {
          attendance_rate?: number | null
          avg_minutes_per_room?: number | null
          cleaned_rooms?: number
          complaint_rate?: number | null
          complaints_cleanliness?: number
          created_at?: string
          hk_employees_on_duty?: number
          hk_hours_total?: number | null
          id?: string
          inspected_rooms?: number
          inspection_pass_rate?: number | null
          occupied_rooms?: number
          passed_rooms?: number
          report_date: string
          rooms_in_sale?: number
          rooms_per_attendant?: number | null
          shift_minutes?: number | null
          total_cleaning_minutes?: number | null
          turnover_rate?: number | null
          updated_at?: string
        }
        Update: {
          attendance_rate?: number | null
          avg_minutes_per_room?: number | null
          cleaned_rooms?: number
          complaint_rate?: number | null
          complaints_cleanliness?: number
          created_at?: string
          hk_employees_on_duty?: number
          hk_hours_total?: number | null
          id?: string
          inspected_rooms?: number
          inspection_pass_rate?: number | null
          occupied_rooms?: number
          passed_rooms?: number
          report_date?: string
          rooms_in_sale?: number
          rooms_per_attendant?: number | null
          shift_minutes?: number | null
          total_cleaning_minutes?: number | null
          turnover_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      import_files: {
        Row: {
          anzahl_konten: number
          filename: string
          id: string
          imported_at: string
          jahr: number
          monat: number
        }
        Insert: {
          anzahl_konten?: number
          filename: string
          id?: string
          imported_at?: string
          jahr: number
          monat: number
        }
        Update: {
          anzahl_konten?: number
          filename?: string
          id?: string
          imported_at?: string
          jahr?: number
          monat?: number
        }
        Relationships: []
      }
      kitchen_daily_reports: {
        Row: {
          attendance_rate: number | null
          complaint_rate_pct: number | null
          correct_orders: number
          covers_total: number
          created_at: string
          food_complaints: number
          food_cost: number
          food_cost_pct: number | null
          food_cost_per_cover: number | null
          food_revenue: number
          food_waste_pct: number | null
          food_waste_value: number | null
          id: string
          kitchen_hours_total: number
          kitchen_labour_cost: number | null
          kitchen_labour_pct: number | null
          kitchen_staff_on_duty: number
          meals_per_employee: number | null
          order_accuracy_pct: number | null
          orders_total: number
          plates_per_hour: number | null
          plates_total: number
          prime_cost_pct: number | null
          report_date: string
          turnover_rate: number | null
          updated_at: string
        }
        Insert: {
          attendance_rate?: number | null
          complaint_rate_pct?: number | null
          correct_orders?: number
          covers_total?: number
          created_at?: string
          food_complaints?: number
          food_cost?: number
          food_cost_pct?: number | null
          food_cost_per_cover?: number | null
          food_revenue?: number
          food_waste_pct?: number | null
          food_waste_value?: number | null
          id?: string
          kitchen_hours_total?: number
          kitchen_labour_cost?: number | null
          kitchen_labour_pct?: number | null
          kitchen_staff_on_duty?: number
          meals_per_employee?: number | null
          order_accuracy_pct?: number | null
          orders_total?: number
          plates_per_hour?: number | null
          plates_total?: number
          prime_cost_pct?: number | null
          report_date: string
          turnover_rate?: number | null
          updated_at?: string
        }
        Update: {
          attendance_rate?: number | null
          complaint_rate_pct?: number | null
          correct_orders?: number
          covers_total?: number
          created_at?: string
          food_complaints?: number
          food_cost?: number
          food_cost_pct?: number | null
          food_cost_per_cover?: number | null
          food_revenue?: number
          food_waste_pct?: number | null
          food_waste_value?: number | null
          id?: string
          kitchen_hours_total?: number
          kitchen_labour_cost?: number | null
          kitchen_labour_pct?: number | null
          kitchen_staff_on_duty?: number
          meals_per_employee?: number | null
          order_accuracy_pct?: number | null
          orders_total?: number
          plates_per_hour?: number | null
          plates_total?: number
          prime_cost_pct?: number | null
          report_date?: string
          turnover_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      konten: {
        Row: {
          bereich: string
          created_at: string
          id: string
          kontobezeichnung: string
          kontoklasse: string
          kontonummer: string
          kostenartt_typ: string
          kpi_kategorie: string
          updated_at: string
        }
        Insert: {
          bereich?: string
          created_at?: string
          id?: string
          kontobezeichnung: string
          kontoklasse: string
          kontonummer: string
          kostenartt_typ?: string
          kpi_kategorie?: string
          updated_at?: string
        }
        Update: {
          bereich?: string
          created_at?: string
          id?: string
          kontobezeichnung?: string
          kontoklasse?: string
          kontonummer?: string
          kostenartt_typ?: string
          kpi_kategorie?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_schwellenwerte: {
        Row: {
          abteilung: string
          alarm_aktiv: boolean
          created_at: string
          id: string
          kpi_typ: string
          schwellenwert_max: number | null
          schwellenwert_min: number | null
          updated_at: string
        }
        Insert: {
          abteilung: string
          alarm_aktiv?: boolean
          created_at?: string
          id?: string
          kpi_typ: string
          schwellenwert_max?: number | null
          schwellenwert_min?: number | null
          updated_at?: string
        }
        Update: {
          abteilung?: string
          alarm_aktiv?: boolean
          created_at?: string
          id?: string
          kpi_typ?: string
          schwellenwert_max?: number | null
          schwellenwert_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          abteilung: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          abteilung?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          abteilung?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salden_monat: {
        Row: {
          created_at: string
          id: string
          jahr: number
          kontonummer: string
          monat: number
          saldo_haben_monat: number
          saldo_monat: number
          saldo_soll_monat: number
        }
        Insert: {
          created_at?: string
          id?: string
          jahr: number
          kontonummer: string
          monat: number
          saldo_haben_monat?: number
          saldo_monat?: number
          saldo_soll_monat?: number
        }
        Update: {
          created_at?: string
          id?: string
          jahr?: number
          kontonummer?: string
          monat?: number
          saldo_haben_monat?: number
          saldo_monat?: number
          saldo_soll_monat?: number
        }
        Relationships: [
          {
            foreignKeyName: "salden_monat_kontonummer_fkey"
            columns: ["kontonummer"]
            isOneToOne: false
            referencedRelation: "konten"
            referencedColumns: ["kontonummer"]
          },
        ]
      }
      service_daily_reports: {
        Row: {
          attendance_rate: number | null
          avg_service_rating: number | null
          covers_per_server_per_hour: number | null
          covers_total: number
          created_at: string
          csat_pct: number | null
          csat_positive_count: number | null
          csat_total_respondents: number | null
          id: string
          items_total: number
          report_date: string
          sales_per_cover: number | null
          sales_per_server: number | null
          service_complaint_rate_pct: number | null
          service_complaints: number
          service_error_rate_pct: number | null
          service_errors: number
          service_hours_total: number
          service_ratings_count: number
          service_ratings_sum: number
          service_revenue: number
          service_staff_on_duty: number
          table_turnover_rate: number | null
          tables_available: number | null
          tables_served: number
          turnover_rate: number | null
          updated_at: string
        }
        Insert: {
          attendance_rate?: number | null
          avg_service_rating?: number | null
          covers_per_server_per_hour?: number | null
          covers_total?: number
          created_at?: string
          csat_pct?: number | null
          csat_positive_count?: number | null
          csat_total_respondents?: number | null
          id?: string
          items_total?: number
          report_date: string
          sales_per_cover?: number | null
          sales_per_server?: number | null
          service_complaint_rate_pct?: number | null
          service_complaints?: number
          service_error_rate_pct?: number | null
          service_errors?: number
          service_hours_total?: number
          service_ratings_count?: number
          service_ratings_sum?: number
          service_revenue?: number
          service_staff_on_duty?: number
          table_turnover_rate?: number | null
          tables_available?: number | null
          tables_served?: number
          turnover_rate?: number | null
          updated_at?: string
        }
        Update: {
          attendance_rate?: number | null
          avg_service_rating?: number | null
          covers_per_server_per_hour?: number | null
          covers_total?: number
          created_at?: string
          csat_pct?: number | null
          csat_positive_count?: number | null
          csat_total_respondents?: number | null
          id?: string
          items_total?: number
          report_date?: string
          sales_per_cover?: number | null
          sales_per_server?: number | null
          service_complaint_rate_pct?: number | null
          service_complaints?: number
          service_error_rate_pct?: number | null
          service_errors?: number
          service_hours_total?: number
          service_ratings_count?: number
          service_ratings_sum?: number
          service_revenue?: number
          service_staff_on_duty?: number
          table_turnover_rate?: number | null
          tables_available?: number | null
          tables_served?: number
          turnover_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      spa_daily_reports: {
        Row: {
          attendance_rate: number | null
          available_treatment_hours: number
          avg_spa_rating: number | null
          booked_treatment_hours: number
          bookings_total: number
          cancellations: number
          complaint_rate_pct: number | null
          created_at: string
          guests_total: number
          id: string
          no_show_rate_pct: number | null
          no_shows: number
          report_date: string
          retail_ratio_pct: number | null
          retail_revenue: number
          revenue_per_guest: number | null
          revpath: number | null
          room_utilization_pct: number | null
          spa_complaints: number
          spa_ratings_count: number
          spa_ratings_sum: number
          spa_revenue: number
          therapist_hours_total: number
          therapist_utilization_pct: number | null
          therapists_on_duty: number
          treatments_per_therapist: number | null
          treatments_total: number
          turnover_rate: number | null
          updated_at: string
        }
        Insert: {
          attendance_rate?: number | null
          available_treatment_hours?: number
          avg_spa_rating?: number | null
          booked_treatment_hours?: number
          bookings_total?: number
          cancellations?: number
          complaint_rate_pct?: number | null
          created_at?: string
          guests_total?: number
          id?: string
          no_show_rate_pct?: number | null
          no_shows?: number
          report_date: string
          retail_ratio_pct?: number | null
          retail_revenue?: number
          revenue_per_guest?: number | null
          revpath?: number | null
          room_utilization_pct?: number | null
          spa_complaints?: number
          spa_ratings_count?: number
          spa_ratings_sum?: number
          spa_revenue?: number
          therapist_hours_total?: number
          therapist_utilization_pct?: number | null
          therapists_on_duty?: number
          treatments_per_therapist?: number | null
          treatments_total?: number
          turnover_rate?: number | null
          updated_at?: string
        }
        Update: {
          attendance_rate?: number | null
          available_treatment_hours?: number
          avg_spa_rating?: number | null
          booked_treatment_hours?: number
          bookings_total?: number
          cancellations?: number
          complaint_rate_pct?: number | null
          created_at?: string
          guests_total?: number
          id?: string
          no_show_rate_pct?: number | null
          no_shows?: number
          report_date?: string
          retail_ratio_pct?: number | null
          retail_revenue?: number
          revenue_per_guest?: number | null
          revpath?: number | null
          room_utilization_pct?: number | null
          spa_complaints?: number
          spa_ratings_count?: number
          spa_ratings_sum?: number
          spa_revenue?: number
          therapist_hours_total?: number
          therapist_utilization_pct?: number | null
          therapists_on_duty?: number
          treatments_per_therapist?: number | null
          treatments_total?: number
          turnover_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      technical_daily_reports: {
        Row: {
          attendance_rate: number | null
          avg_resolution_time_min: number
          cost_per_ticket: number | null
          created_at: string
          emergency_rate_pct: number | null
          emergency_repairs: number
          energy_consumption_kwh: number
          energy_per_room: number | null
          external_costs: number
          id: string
          material_costs: number
          new_tickets: number
          occupied_rooms: number
          open_tickets: number
          preventive_maintenance_done: number
          preventive_maintenance_pct: number | null
          preventive_maintenance_planned: number
          report_date: string
          resolved_tickets: number
          same_day_resolution_pct: number | null
          technician_hours_total: number
          technicians_on_duty: number
          ticket_backlog_rate_pct: number | null
          tickets_per_technician: number | null
          turnover_rate: number | null
          updated_at: string
        }
        Insert: {
          attendance_rate?: number | null
          avg_resolution_time_min?: number
          cost_per_ticket?: number | null
          created_at?: string
          emergency_rate_pct?: number | null
          emergency_repairs?: number
          energy_consumption_kwh?: number
          energy_per_room?: number | null
          external_costs?: number
          id?: string
          material_costs?: number
          new_tickets?: number
          occupied_rooms?: number
          open_tickets?: number
          preventive_maintenance_done?: number
          preventive_maintenance_pct?: number | null
          preventive_maintenance_planned?: number
          report_date: string
          resolved_tickets?: number
          same_day_resolution_pct?: number | null
          technician_hours_total?: number
          technicians_on_duty?: number
          ticket_backlog_rate_pct?: number | null
          tickets_per_technician?: number | null
          turnover_rate?: number | null
          updated_at?: string
        }
        Update: {
          attendance_rate?: number | null
          avg_resolution_time_min?: number
          cost_per_ticket?: number | null
          created_at?: string
          emergency_rate_pct?: number | null
          emergency_repairs?: number
          energy_consumption_kwh?: number
          energy_per_room?: number | null
          external_costs?: number
          id?: string
          material_costs?: number
          new_tickets?: number
          occupied_rooms?: number
          open_tickets?: number
          preventive_maintenance_done?: number
          preventive_maintenance_pct?: number | null
          preventive_maintenance_planned?: number
          report_date?: string
          resolved_tickets?: number
          same_day_resolution_pct?: number | null
          technician_hours_total?: number
          technicians_on_duty?: number
          ticket_backlog_rate_pct?: number | null
          tickets_per_technician?: number | null
          turnover_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_daily_department_hours: {
        Row: {
          abteilung: string | null
          datum: string | null
          gesamt_ist_stunden: number | null
          gesamt_personalkosten: number | null
          gesamt_soll_stunden: number | null
          gesamt_ueberstunden: number | null
          mitarbeiter_anwesend: number | null
          mitarbeiter_krank: number | null
          mitarbeiter_urlaub: number | null
        }
        Relationships: []
      }
      v_department_monthly_staff_kpis: {
        Row: {
          abteilung: string | null
          anwesenheitsquote_pct: number | null
          arbeitstage: number | null
          fortbildungstage: number | null
          ist_stunden_monat: number | null
          jahr: number | null
          krankenquote_pct: number | null
          krankheitstage: number | null
          mitarbeiter_gesamt: number | null
          monat: number | null
          personalkosten_monat: number | null
          soll_stunden_monat: number | null
          ueberstunden_monat: number | null
          urlaubstage: number | null
        }
        Relationships: []
      }
      v_department_staff_kpis: {
        Row: {
          abteilung: string | null
          anwesenheitsquote_pct: number | null
          datum: string | null
          durchschnitt_stunden_pro_ma: number | null
          durchschnitt_stundenlohn: number | null
          ist_stunden: number | null
          krankenquote_pct: number | null
          mitarbeiter_anwesend: number | null
          mitarbeiter_geplant: number | null
          mitarbeiter_krank: number | null
          mitarbeiter_urlaub: number | null
          personalkosten: number | null
          soll_stunden: number | null
          ueberstunden: number | null
        }
        Relationships: []
      }
      v_employee_department_stats: {
        Row: {
          abteilung: string | null
          aktive_mitarbeiter: number | null
          aushilfe_count: number | null
          durchschnitt_stundenlohn: number | null
          gesamt_wochenstunden_soll: number | null
          inaktive_mitarbeiter: number | null
          minijob_count: number | null
          teilzeit_count: number | null
          vollzeit_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_department_staff_stats: {
        Args: { p_abteilung: string; p_datum: string }
        Returns: {
          anwesenheitsquote_pct: number
          ist_stunden: number
          mitarbeiter_anwesend: number
          mitarbeiter_krank: number
          mitarbeiter_urlaub: number
          personalkosten: number
          soll_stunden: number
          ueberstunden: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      absence_reason:
        | "Arbeit"
        | "Urlaub"
        | "Krank"
        | "Fortbildung"
        | "Frei"
        | "Überstundenabbau"
        | "Elternzeit"
        | "Sonstiges"
      app_role: "admin" | "abteilungsleiter" | "mitarbeiter"
      employment_type:
        | "Vollzeit"
        | "Teilzeit"
        | "Mini-Job"
        | "Aushilfe"
        | "Praktikant"
        | "Azubi"
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
    Enums: {
      absence_reason: [
        "Arbeit",
        "Urlaub",
        "Krank",
        "Fortbildung",
        "Frei",
        "Überstundenabbau",
        "Elternzeit",
        "Sonstiges",
      ],
      app_role: ["admin", "abteilungsleiter", "mitarbeiter"],
      employment_type: [
        "Vollzeit",
        "Teilzeit",
        "Mini-Job",
        "Aushilfe",
        "Praktikant",
        "Azubi",
      ],
    },
  },
} as const
