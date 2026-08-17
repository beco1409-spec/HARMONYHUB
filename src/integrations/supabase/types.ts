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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      avisos: {
        Row: {
          autor_id: string
          created_at: string
          id: string
          mensagem: string
        }
        Insert: {
          autor_id: string
          created_at?: string
          id?: string
          mensagem: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          id?: string
          mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantor_tons: {
        Row: {
          cantor_id: string
          created_at: string
          id: string
          musica_id: string
          observacoes: string | null
          tom: string
          updated_at: string
        }
        Insert: {
          cantor_id: string
          created_at?: string
          id?: string
          musica_id: string
          observacoes?: string | null
          tom: string
          updated_at?: string
        }
        Update: {
          cantor_id?: string
          created_at?: string
          id?: string
          musica_id?: string
          observacoes?: string | null
          tom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cantor_tons_cantor_id_fkey"
            columns: ["cantor_id"]
            isOneToOne: false
            referencedRelation: "cantores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantor_tons_musica_id_fkey"
            columns: ["musica_id"]
            isOneToOne: false
            referencedRelation: "musicas"
            referencedColumns: ["id"]
          },
        ]
      }
      cantores: {
        Row: {
          created_at: string
          extensao_vocal: string | null
          foto_url: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
          voz: string | null
        }
        Insert: {
          created_at?: string
          extensao_vocal?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          voz?: string | null
        }
        Update: {
          created_at?: string
          extensao_vocal?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          voz?: string | null
        }
        Relationships: []
      }
      culto_historico: {
        Row: {
          created_at: string
          culto_id: string
          encerrado_em: string
          id: string
          iniciado_em: string
          total_musicas: number
        }
        Insert: {
          created_at?: string
          culto_id: string
          encerrado_em?: string
          id?: string
          iniciado_em: string
          total_musicas?: number
        }
        Update: {
          created_at?: string
          culto_id?: string
          encerrado_em?: string
          id?: string
          iniciado_em?: string
          total_musicas?: number
        }
        Relationships: [
          {
            foreignKeyName: "culto_historico_culto_id_fkey"
            columns: ["culto_id"]
            isOneToOne: false
            referencedRelation: "cultos"
            referencedColumns: ["id"]
          },
        ]
      }
      culto_live: {
        Row: {
          created_at: string
          culto_id: string
          ended_at: string | null
          id: string
          playing: boolean
          repertorio_id: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          culto_id: string
          ended_at?: string | null
          id?: string
          playing?: boolean
          repertorio_id?: string | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          culto_id?: string
          ended_at?: string | null
          id?: string
          playing?: boolean
          repertorio_id?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "culto_live_culto_id_fkey"
            columns: ["culto_id"]
            isOneToOne: true
            referencedRelation: "cultos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culto_live_repertorio_id_fkey"
            columns: ["repertorio_id"]
            isOneToOne: false
            referencedRelation: "repertorio_culto"
            referencedColumns: ["id"]
          },
        ]
      }
      cultos: {
        Row: {
          created_at: string
          data: string
          hora: string
          id: string
          local: string | null
          nome: string
          pregador: string | null
          responsavel: string | null
          tema: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          hora?: string
          id?: string
          local?: string | null
          nome?: string
          pregador?: string | null
          responsavel?: string | null
          tema?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          hora?: string
          id?: string
          local?: string | null
          nome?: string
          pregador?: string | null
          responsavel?: string | null
          tema?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      instrumentistas: {
        Row: {
          created_at: string
          disponibilidade: string | null
          foto_url: string | null
          id: string
          instrumento: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          disponibilidade?: string | null
          foto_url?: string | null
          id?: string
          instrumento: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          disponibilidade?: string | null
          foto_url?: string | null
          id?: string
          instrumento?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      integrantes_culto: {
        Row: {
          cantor_id: string | null
          created_at: string
          culto_id: string
          funcao: string
          id: string
          instrumentista_id: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          cantor_id?: string | null
          created_at?: string
          culto_id: string
          funcao: string
          id?: string
          instrumentista_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          cantor_id?: string | null
          created_at?: string
          culto_id?: string
          funcao?: string
          id?: string
          instrumentista_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrantes_culto_cantor_id_fkey"
            columns: ["cantor_id"]
            isOneToOne: false
            referencedRelation: "cantores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrantes_culto_culto_id_fkey"
            columns: ["culto_id"]
            isOneToOne: false
            referencedRelation: "cultos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrantes_culto_instrumentista_id_fkey"
            columns: ["instrumentista_id"]
            isOneToOne: false
            referencedRelation: "instrumentistas"
            referencedColumns: ["id"]
          },
        ]
      }
      musica_favoritos: {
        Row: {
          created_at: string
          id: string
          musica_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          musica_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          musica_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "musica_favoritos_musica_id_fkey"
            columns: ["musica_id"]
            isOneToOne: false
            referencedRelation: "musicas"
            referencedColumns: ["id"]
          },
        ]
      }
      musicas: {
        Row: {
          autor: string | null
          bpm: number | null
          cifra: string | null
          cifraclub_url: string | null
          compasso: string | null
          created_at: string
          duracao: string | null
          id: string
          letra: string | null
          mapa: string | null
          ministerio: string | null
          multitrack_url: string | null
          nome: string
          observacoes: string | null
          playback_url: string | null
          tom_original: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          autor?: string | null
          bpm?: number | null
          cifra?: string | null
          cifraclub_url?: string | null
          compasso?: string | null
          created_at?: string
          duracao?: string | null
          id?: string
          letra?: string | null
          mapa?: string | null
          ministerio?: string | null
          multitrack_url?: string | null
          nome: string
          observacoes?: string | null
          playback_url?: string | null
          tom_original?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          autor?: string | null
          bpm?: number | null
          cifra?: string | null
          cifraclub_url?: string | null
          compasso?: string | null
          created_at?: string
          duracao?: string | null
          id?: string
          letra?: string | null
          mapa?: string | null
          ministerio?: string | null
          multitrack_url?: string | null
          nome?: string
          observacoes?: string | null
          playback_url?: string | null
          tom_original?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          funcao_vocal: string | null
          id: string
          nome_completo: string
          notificacoes_ativas: boolean
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          funcao_vocal?: string | null
          id: string
          nome_completo?: string
          notificacoes_ativas?: boolean
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          funcao_vocal?: string | null
          id?: string
          nome_completo?: string
          notificacoes_ativas?: boolean
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      repertorio_culto: {
        Row: {
          cantor_id: string | null
          created_at: string
          culto_id: string
          id: string
          musica_id: string
          observacoes: string | null
          ordem: number
          tom_override: string | null
          updated_at: string
        }
        Insert: {
          cantor_id?: string | null
          created_at?: string
          culto_id: string
          id?: string
          musica_id: string
          observacoes?: string | null
          ordem?: number
          tom_override?: string | null
          updated_at?: string
        }
        Update: {
          cantor_id?: string | null
          created_at?: string
          culto_id?: string
          id?: string
          musica_id?: string
          observacoes?: string | null
          ordem?: number
          tom_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repertorio_culto_cantor_id_fkey"
            columns: ["cantor_id"]
            isOneToOne: false
            referencedRelation: "cantores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repertorio_culto_culto_id_fkey"
            columns: ["culto_id"]
            isOneToOne: false
            referencedRelation: "cultos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repertorio_culto_musica_id_fkey"
            columns: ["musica_id"]
            isOneToOne: false
            referencedRelation: "musicas"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "lider" | "cantor" | "instrumentista" | "membro"
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
      app_role: ["lider", "cantor", "instrumentista", "membro"],
    },
  },
} as const
