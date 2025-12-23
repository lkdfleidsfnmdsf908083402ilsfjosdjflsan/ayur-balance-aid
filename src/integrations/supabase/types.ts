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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
