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
